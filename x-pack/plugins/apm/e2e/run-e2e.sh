#!/usr/bin/env bash

# variables
KIBANA_PORT=5701
ELASTICSEARCH_PORT=9201
APM_SERVER_PORT=8201

# ensure Docker is running
docker ps &> /dev/null
if [ $? -ne 0 ]; then
    printf "⚠️  Please start Docker"
    exit 1
fi

# formatting
bold=$(tput bold)
normal=$(tput sgr0)

# paths
E2E_DIR="${0%/*}"
TMP_DIR="./tmp"
APM_IT_DIR="./tmp/apm-integration-testing"

cd ${E2E_DIR}

#
# Ask user to start Kibana
##################################################
printf "\n\n${bold}To start Kibana please run the following command:${normal}
node ./scripts/kibana --no-base-path --dev --no-dev-config --config x-pack/plugins/apm/e2e/ci/kibana.e2e.yml"

#
# Create tmp folder
##################################################
printf "\n\n${bold}Temporary folder${normal}"
printf "\nTemporary files will be stored in: ${TMP_DIR}"
mkdir -p ${TMP_DIR}

#
# apm-integration-testing
##################################################
printf "\n\n${bold}apm-integration-testing (logs: ${TMP_DIR}/apm-it.log)${normal}"

# pull if folder already exists
if [ -d ${APM_IT_DIR} ]; then
    printf "\nPulling from master..."
    git -C ${APM_IT_DIR} pull &> ${TMP_DIR}/apm-it.log

# clone if folder does not exists
else
    printf "\nCloning repository"
    git clone "https://github.com/elastic/apm-integration-testing.git" ${APM_IT_DIR} &> ${TMP_DIR}/apm-it.log
fi

# Stop if clone/pull failed
if [ $? -ne 0 ]; then
    printf "\n⚠️  Initializing apm-integration-testing failed. \n"
    exit 1
fi

# Start apm-integration-testing
printf "\nStarting docker-compose"
${APM_IT_DIR}/scripts/compose.py start master \
    --no-kibana \
    --elasticsearch-port $ELASTICSEARCH_PORT \
    --apm-server-port=$APM_SERVER_PORT \
    --elasticsearch-heap 4g \
    --apm-server-opt queue.mem.events=8192 \
    --apm-server-opt output.elasticsearch.bulk_max_size=4096 \
    &> ${TMP_DIR}/apm-it.log

# Stop if apm-integration-testing failed to start correctly
if [ $? -ne 0 ]; then
    printf "\n⚠️  apm-integration-testing could not be started.\n"
    printf "\nPlease see the logs in ${TMP_DIR}/apm-it.log\n\n"
    printf "\nAs a last resort, reset docker with:\n\n cd ${APM_IT_DIR} && scripts/compose.py stop && docker system prune --all --force --volumes\n"
    exit 1
fi

#
# Cypress
##################################################
printf "\n\n${bold}Cypress (logs: ${TMP_DIR}/e2e-yarn.log)${normal}"
printf "\nInstalling cypress dependencies "
yarn &> ${TMP_DIR}/e2e-yarn.log

#
# Static mock data
##################################################
printf "\n\n${bold}Static mock data (logs: ${TMP_DIR}/ingest-data.log)\n${normal}"

# Download static data if not already done
if [ ! -e "${TMP_DIR}/events.json" ]; then
    printf 'Downloading events.json...'
    curl --silent https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output ${TMP_DIR}/events.json
fi

# printf "Deleting existing indices (apm* and .apm*)"
curl --silent --user admin:changeme -XDELETE "localhost:${ELASTICSEARCH_PORT}/.apm*" > /dev/null
curl --silent --user admin:changeme -XDELETE "localhost:${ELASTICSEARCH_PORT}/apm*" > /dev/null

# Ingest data into APM Server
node ingest-data/replay.js --server-url http://localhost:$APM_SERVER_PORT --events ${TMP_DIR}/events.json 2>> ${TMP_DIR}/ingest-data.log

# Stop if not all events were ingested correctly
if [ $? -ne 0 ]; then
    printf "\n⚠️  Not all events were ingested correctly. This might affect test tests. \n"

    # stop docker containers
    cd ${APM_IT_DIR} && ./scripts/compose.py stop > /dev/null && cd -

    printf "Aborting. Please try again."
    exit 1
fi

# create empty snapshot file if it doesn't exist
SNAPSHOTS_FILE=cypress/integration/snapshots.js
if [ ! -f ${SNAPSHOTS_FILE} ]; then
    echo "{}" > ${SNAPSHOTS_FILE}
fi

#
# Wait for Kibana to start
##################################################
printf "\n\n${bold}Waiting for Kibana to start...${normal}"
printf "\nNote: you need to start Kibana manually. Find the instructions at the top."
yarn wait-on -i 500 -w 500 http-get://admin:changeme@localhost:$KIBANA_PORT/api/status > /dev/null

## Workaround to wait for the http server running
## See: https://github.com/elastic/kibana/issues/66326
if [ -e kibana.log ] ; then
    grep -m 1 "http server running" <(tail -f -n +1 kibana.log)
    printf "\n✅ Kibana server running...\n"
    grep -m 1 "bundles compiled successfully" <(tail -f -n +1 kibana.log)
    printf "\n✅ Kibana bundles have been compiled...\n"
fi


printf "\n✅ Setup completed successfully. Running tests...\n"

#
# run cypress tests
##################################################
yarn cypress run --config pageLoadTimeout=100000,watchForFileChanges=true

#
# Run interactively
##################################################
printf "

${bold}If you want to run the test interactively, run:${normal}

cd ${E2E_DIR} && yarn cypress open --config pageLoadTimeout=100000,watchForFileChanges=true
"

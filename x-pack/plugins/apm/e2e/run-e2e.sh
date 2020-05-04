#!/bin/sh

# variables
KIBANA_PORT=5701
ELASTICSEARCH_PORT=9201
APM_SERVER_PORT=8201

# ensure Docker is running
docker ps &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Please start Docker"
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
echo "\n${bold}To start Kibana please run the following command:${normal}
node ./scripts/kibana --no-base-path --dev --no-dev-config --config x-pack/plugins/apm/e2e/ci/kibana.e2e.yml"

#
# Create tmp folder
##################################################
echo "\n${bold}Temporary folder${normal}"
echo "Temporary files will be stored in: ${TMP_DIR}"
mkdir -p ${TMP_DIR}

#
# apm-integration-testing
##################################################
printf "\n${bold}apm-integration-testing (logs: ${TMP_DIR}/apm-it.log)\n${normal}"

# pull if folder already exists
if [ -d ${APM_IT_DIR} ]; then
    echo "Pulling from master..."
    git -C ${APM_IT_DIR} pull &> ${TMP_DIR}/apm-it.log

# clone if folder does not exists
else
    echo "Cloning repository"
    git clone "https://github.com/elastic/apm-integration-testing.git" ${APM_IT_DIR} &> ${TMP_DIR}/apm-it.log
fi

# Stop if clone/pull failed
if [ $? -ne 0 ]; then
    printf "\n⚠️  Initializing apm-integration-testing failed. \n"
    exit 1
fi

# Start apm-integration-testing
echo "Starting docker-compose"
${APM_IT_DIR}/scripts/compose.py start master \
    --no-kibana \
    --elasticsearch-port $ELASTICSEARCH_PORT \
    --apm-server-port=$APM_SERVER_PORT \
    --elasticsearch-heap 4g \
    &> ${TMP_DIR}/apm-it.log

# Stop if apm-integration-testing failed to start correctly
if [ $? -ne 0 ]; then
    printf "⚠️  apm-integration-testing could not be started.\n"
    printf "Please see the logs in ${TMP_DIR}/apm-it.log\n\n"
    printf "As a last resort, reset docker with:\n\n cd ${APM_IT_DIR} && scripts/compose.py stop && docker system prune --all --force --volumes\n"
    exit 1
fi

#
# Cypress
##################################################
echo "\n${bold}Cypress (logs: ${TMP_DIR}/e2e-yarn.log)${normal}"
echo "Installing cypress dependencies "
yarn &> ${TMP_DIR}/e2e-yarn.log

#
# Static mock data
##################################################
printf "\n${bold}Static mock data (logs: ${TMP_DIR}/ingest-data.log)\n${normal}"

# Download static data if not already done
if [ ! -e "${TMP_DIR}/events.json" ]; then
    echo 'Downloading events.json...'
    curl --silent https://storage.googleapis.com/apm-ui-e2e-static-data/events.json --output ${TMP_DIR}/events.json
fi

# echo "Deleting existing indices (apm* and .apm*)"
curl --silent --user admin:changeme -XDELETE "localhost:${ELASTICSEARCH_PORT}/.apm*" > /dev/null
curl --silent --user admin:changeme -XDELETE "localhost:${ELASTICSEARCH_PORT}/apm*" > /dev/null

# Ingest data into APM Server
node ingest-data/replay.js --server-url http://localhost:$APM_SERVER_PORT --events ${TMP_DIR}/events.json 2> ${TMP_DIR}/ingest-data.log

# Stop if not all events were ingested correctly
if [ $? -ne 0 ]; then
    printf "\n⚠️  Not all events were ingested correctly. This might affect test tests. \n"
    exit 1
fi

#
# Wait for Kibana to start
##################################################
echo "\n${bold}Waiting for Kibana to start...${normal}"
echo "Note: you need to start Kibana manually. Find the instructions at the top."
yarn wait-on -i 500 -w 500 http://localhost:$KIBANA_PORT > /dev/null

echo "\n✅ Setup completed successfully. Running tests...\n"

#
# run cypress tests
##################################################
yarn cypress run --config pageLoadTimeout=100000,watchForFileChanges=true

#
# Run interactively
##################################################
echo "

${bold}If you want to run the test interactively, run:${normal}

yarn cypress open --config pageLoadTimeout=100000,watchForFileChanges=true
"


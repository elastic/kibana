#!/usr/bin/env bash

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
TMP_DIR="tmp"
APM_IT_DIR="tmp/apm-integration-testing"
WAIT_ON_BIN="../../../../node_modules/.bin/wait-on"
CYPRESS_BIN="../../../../node_modules/.bin/cypress"

cd ${E2E_DIR}

KIBANA_VERSION=$(node -p "require('../../../package.json').version")

#
# Ask user to start Kibana
##################################################
echo "" # newline
echo "${bold}To start Kibana please run the following command:${normal}
node ./scripts/kibana --no-base-path --dev --no-dev-config --config x-pack/plugins/apm/e2e/ci/kibana.e2e.yml"

#
# Create tmp folder
##################################################
echo "" # newline
echo "${bold}Temporary folder${normal}"
echo "Temporary files will be stored in: ${E2E_DIR}${TMP_DIR}"
mkdir -p ${TMP_DIR}

#
# apm-integration-testing
##################################################
echo "" # newline
echo "${bold}apm-integration-testing (logs: ${E2E_DIR}${TMP_DIR}/apm-it.log)${normal}"

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
    echo "⚠️  Initializing apm-integration-testing failed."
    exit 1
fi

# Start apm-integration-testing
echo "Starting docker-compose"
echo "Using stack version: ${KIBANA_VERSION}"
${APM_IT_DIR}/scripts/compose.py start $KIBANA_VERSION \
    --no-kibana \
    --elasticsearch-port $ELASTICSEARCH_PORT \
    --apm-server-port=$APM_SERVER_PORT \
    --elasticsearch-heap 4g \
    --apm-server-opt queue.mem.events=8192 \
    --apm-server-opt output.elasticsearch.bulk_max_size=4096 \
    &> ${TMP_DIR}/apm-it.log

# Stop if apm-integration-testing failed to start correctly
if [ $? -ne 0 ]; then
    echo "⚠️  apm-integration-testing could not be started"
    echo "" # newline
    echo "As a last resort, reset docker with:"
    echo "" # newline
    echo "cd ${E2E_DIR}${APM_IT_DIR} && scripts/compose.py stop && docker system prune --all --force --volumes"
    echo "" # newline

    # output logs for excited docker containers
    cd ${APM_IT_DIR} && docker-compose ps --filter "status=exited" -q | xargs -L1 docker logs --tail=10 && cd -

    echo "" # newline
    echo "Find the full logs in ${E2E_DIR}${TMP_DIR}/apm-it.log"
    exit 1
fi

#
# Static mock data
##################################################
echo "" # newline
echo "${bold}Static mock data (logs: ${E2E_DIR}${TMP_DIR}/ingest-data.log)${normal}"

STATIC_MOCK_FILENAME='2020-06-12.json'

# Download static data if not already done
if [ ! -e "${TMP_DIR}/${STATIC_MOCK_FILENAME}" ]; then
    echo "Downloading ${STATIC_MOCK_FILENAME}..."
    curl --silent https://storage.googleapis.com/apm-ui-e2e-static-data/${STATIC_MOCK_FILENAME} --output ${TMP_DIR}/${STATIC_MOCK_FILENAME}
fi

# echo "Deleting existing indices (apm* and .apm*)"
curl --silent --user admin:changeme -XDELETE "localhost:${ELASTICSEARCH_PORT}/.apm*" > /dev/null
curl --silent --user admin:changeme -XDELETE "localhost:${ELASTICSEARCH_PORT}/apm*" > /dev/null

# Ingest data into APM Server
node ingest-data/replay.js --server-url http://localhost:$APM_SERVER_PORT --events ${TMP_DIR}/${STATIC_MOCK_FILENAME} 2>> ${TMP_DIR}/ingest-data.log

# Abort if not all events were ingested correctly
if [ $? -ne 0 ]; then
    echo "⚠️  Not all events were ingested correctly. This might affect test tests."
    echo "Aborting. Please try again."
    echo "" # newline
    echo "Full logs in ${E2E_DIR}${TMP_DIR}/ingest-data.log:"

    # output logs for excited docker containers
    cd ${APM_IT_DIR} && docker-compose ps --filter "status=exited" -q | xargs -L1 docker logs --tail=3 && cd -

    # stop docker containers
    cd ${APM_IT_DIR} && ./scripts/compose.py stop > /dev/null && cd -
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
echo "" # newline
echo "${bold}Waiting for Kibana to start...${normal}"
echo "Note: you need to start Kibana manually. Find the instructions at the top."
$WAIT_ON_BIN -i 500 -w 500 http-get://admin:changeme@localhost:$KIBANA_PORT/api/status > /dev/null

## Workaround to wait for the http server running
## See: https://github.com/elastic/kibana/issues/66326
if [ -e kibana.log ] ; then
    grep -m 1 "http server running" <(tail -f -n +1 kibana.log)
    echo "✅ Kibana server running..."
    grep -m 1 "bundles compiled successfully" <(tail -f -n +1 kibana.log)
    echo "✅ Kibana bundles have been compiled..."
fi


echo "✅ Setup completed successfully. Running tests..."

#
# run cypress tests
##################################################
$CYPRESS_BIN run --config pageLoadTimeout=100000,watchForFileChanges=true
e2e_status=$?

#
# Run interactively
##################################################
echo "${bold}If you want to run the test interactively, run:${normal}"
echo "" # newline
echo "cd ${E2E_DIR} && ${CYPRESS_BIN} open --config pageLoadTimeout=100000,watchForFileChanges=true"

# Report the e2e status at the very end
if [ $e2e_status -ne 0 ]; then
    echo "⚠️  Running tests failed."
    exit 1
fi

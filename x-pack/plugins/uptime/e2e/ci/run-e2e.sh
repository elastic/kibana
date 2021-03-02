#!/usr/bin/env bash
##
## This is a wrapper to configure the environment with the right tools in the CI
## and run the e2e steps.
##

# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
set -ex

# variables
KIBANA_PORT=5601

# formatting
bold=$(tput bold)
normal=$(tput sgr0)

# paths
E2E_DIR="${0%/*}/.."
WAIT_ON_BIN="../../../../../node_modules/.bin/wait-on"

cd "${E2E_DIR}"

#
# Ask user to start Kibana
##################################################
echo "" # newline
echo "${bold}To start Kibana please run the following command:${normal}
node ./scripts/start_e2e_server.js"

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
node "${E2E_DIR}"/scripts/start_e2e_runner.js
e2e_status=$?

# Report the e2e status at the very end
if [ $e2e_status -ne 0 ]; then
    echo "⚠️  Running tests failed."
    exit 1
fi

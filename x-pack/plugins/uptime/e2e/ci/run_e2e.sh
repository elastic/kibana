#!/usr/bin/env bash
##
## This is a wrapper to configure the environment with the right tools in the CI
## and run the e2e steps.
##

# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
set -e

# variables
KIBANA_PORT=5620

# formatting
bold=$(tput bold)
normal=$(tput sgr0)

# paths
E2E_DIR="${0%/*}/../.."

cd "${E2E_DIR}"

#
# Ask user to start Kibana
##################################################
echo "" # newline
echo "${bold}To start Kibana please run the following command:${normal}
node ./scripts/start_e2e_server.js"

echo "✅ Setup completed successfully. Running tests..."
node ./scripts/start_e2e_runner.js
e2e_status=$?

# Report the e2e status at the very end
if [ $e2e_status -ne 0 ]; then
    echo "⚠️  Running tests failed."
    exit 1
fi

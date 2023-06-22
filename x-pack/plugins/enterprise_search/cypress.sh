#! /bin/bash

# Use either `cypress run` or `cypress open` - defaults to run
MODE="${1}"

if [ "$MODE" == "dev" ]; then
  echo "Running dev mode. This will run cypress only"
  node ../../../node_modules/.bin/cypress open --config-file ./cypress.config.ts ${2}
else
  if ! docker info > /dev/null 2>&1; then
    echo "This script needs docker to run. Start docker and try again."
    echo "If you are testing against your own setup use ./cypress.sh dev"
    exit 1
  fi

  if [ "$MODE" == "open" ]; then
    node ../../../scripts/functional_tests --config ../../test/functional_enterprise_search/visual_config.ts
  else
    node ../../../scripts/functional_tests --config ../../test/functional_enterprise_search/cli_config.ts
  fi
fi


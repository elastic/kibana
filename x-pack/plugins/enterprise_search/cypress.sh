#! /bin/bash

if ! docker info > /dev/null 2>&1; then
  echo "This script needs docker to run. If you are testing against your own setup use cypress directly"
  exit 1
fi

# Use either `cypress run` or `cypress open` - defaults to run
MODE="${1}"

if [ "$MODE" == "open" ]; then
  node ../../../scripts/functional_tests --config ../../test/functional_enterprise_search/visual_config.ts
else
  node ../../../scripts/functional_tests --config ../../test/functional_enterprise_search/cli_config.ts
fi


#!/usr/bin/env bash
set -ex

E2E_DIR=x-pack/plugins/apm/e2e
echo "1/2 Install dependencies ..."
# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
yarn kbn clean && yarn kbn bootstrap

echo "2/2 Start Kibana ..."
## Might help to avoid FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
export NODE_OPTIONS="--max-old-space-size=4096"
nohup node ./scripts/kibana --no-base-path --no-watch --dev --no-dev-config --config ${E2E_DIR}/ci/kibana.e2e.yml > ${E2E_DIR}/kibana.log 2>&1 &

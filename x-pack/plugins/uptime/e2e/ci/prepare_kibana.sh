#!/usr/bin/env bash
set -e

UPTIME_DIR=x-pack/plugins/uptime
echo "1/2 Install dependencies..."
# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
yarn kbn bootstrap

echo "2/2 Start Kibana..."
## Might help to avoid FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
export NODE_OPTIONS="--max-old-space-size=4096"
cd $UPTIME_DIR
nohup node ./scripts/start_e2e_server.js > e2e/kibana.log 2>&1 &

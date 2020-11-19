#!/usr/bin/env bash
##
## This is a wrapper to configure the environment with the right tools in the CI
## and run the e2e steps.
##

E2E_DIR="${0%/*}/.."
# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
set -ex
"${E2E_DIR}"/run-e2e.sh

#!/usr/bin/env bash
##
## This is a wrapper to configure the environment with the right tools in the CI
## and run the cypress steps.
##
## NOTE: it's required to run run-e2e.sh previously. This is the wrapper to help with
##       the rerun of the e2e.
##

E2E_DIR="${0%/*}/.."
# shellcheck disable=SC1091
source src/dev/ci_setup/setup_env.sh true
set -ex
cd "${E2E_DIR}"

## Let's remove the previous run test results to avoid messing up
## with the test reporting in the CI.
rm cypress/test-results/*.* || true
rm -rf cypress/screenshots/* || true

## Let's move previous videos to a backup folder.
old_videos="cypress/videos/previous/$(date +%s)"
mkdir -p "${old_videos}"
mv cypress/videos/*.mp4 "${old_videos}/"

yarn cypress run --config pageLoadTimeout=100000,watchForFileChanges=true

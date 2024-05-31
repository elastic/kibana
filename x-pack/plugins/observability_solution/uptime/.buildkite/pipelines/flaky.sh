#!/usr/bin/env bash

set -euo pipefail

UUID="$(cat /proc/sys/kernel/random/uuid)"
export UUID

node x-pack/plugins/observability_solution/synthetics/.buildkite/pipelines/flaky.js | buildkite-agent pipeline upload

#!/usr/bin/env bash

# cluster configuration
export VERSION='7.17.0'
export DEPLOYMENT_NAME='performance-apm-cluster'
export HOST='https://staging.found.no'
export REGION='gcp-us-central1'
export HARDWARE_PROFILE='gcp-cpu-optimized'

export KB_ROOT='../../../../../../'
export ES_TARGET=${ES_TARGET-}

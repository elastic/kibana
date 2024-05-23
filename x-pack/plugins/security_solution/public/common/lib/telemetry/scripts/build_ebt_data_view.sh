#!/usr/bin/env sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Set default values for optional arguments if not provided
kibana_url="https://dac92c18e1014fc592c05bcabd0ad677.us-west1.gcp.cloud.es.io:9243"
space_id="securitysolution"
data_view_name="security-sample-dv"
telemetry_type="browser"

# Parse named arguments
while [ "$#" -gt 0 ]; do
  case "$1" in
    --api_key=*)
      api_key="${1#*=}"
      ;;
    --kibana_url=*)
      kibana_url="${1#*=}"
      ;;
    --space_id=*)
      space_id="${1#*=}"
      ;;
    --data_view_name=*)
      data_view_name="${1#*=}"
      ;;
    --telemetry_type=*)
      telemetry_type="${1#*=}"
      ;;
    *)
      echo "Error: Invalid argument: $1" >&2
      exit 1
      ;;
  esac
  shift
done

# Check if mandatory arguments are provided
if [ -z "$api_key" ]; then
  echo "Error: api_key is a mandatory argument." >&2
  exit 1
fi

# Validate telemetry_type
if [ "$telemetry_type" != "browser" ] && [ "$telemetry_type" != "server" ]; then
  echo "Error: telemetry_type must be either 'browser' or 'server'." >&2
  exit 1
fi

npx ts-node "$(dirname "${0}")/build_ebt_data_view.ts" \
  --api_key="$api_key" \
  --kibana_url="$kibana_url" \
  --space_id="$space_id" \
  --data_view_name="$data_view_name" \
  --telemetry_type="$telemetry_type"

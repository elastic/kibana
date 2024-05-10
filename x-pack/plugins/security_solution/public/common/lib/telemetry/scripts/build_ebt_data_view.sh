#!/usr/bin/env sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Set default values for optional arguments if not provided
kibana_url="https://telemetry-v2-staging.elastic.dev"
space_id="securitysolution"
data_view_name="security-solution-ebt-kibana-browser"

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

npx ts-node "$(dirname "${0}")/build_ebt_data_view.ts" \
  --api_key="$api_key" \
  --kibana_url="$kibana_url" \
  --space_id="$space_id" \
  --data_view_name="$data_view_name"

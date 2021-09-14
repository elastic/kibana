#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
STATUS=${1:-active}
TIMELINE_TYPE=${2:-default}

# Example get all timelines:
# sh ./timelines/find_timeline_by_filter.sh active default

# Example get all prepackaged timeline templates:
# ./timelines/find_timeline_by_filter.sh immutable template

# Example get all custom timeline templates:
# sh ./timelines/find_timeline_by_filter.sh active template

curl -s -k \
  -H "Content-Type: application/json" \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET "${KIBANA_URL}${SPACE_URL}/api/timelines?only_user_favorite=false&status=$STATUS&timeline_type=$TIMELINE_TYPE" \
  | jq .



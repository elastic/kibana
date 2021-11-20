#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Creates a new case and then gets it if no CASE_ID is specified

# Example:
# ./get_case.sh

# Example with CASE_ID arg:
# ./get_case.sh 1234-example-id

set -e
./check_env_variables.sh


if [ "$1" ]; then
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET "${KIBANA_URL}${SPACE_URL}/api/cases/$1" \
  | jq .;
  exit 1
else
  CASE_ID=("$(./generate_case_data.sh | jq '.id' -j)")
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET "${KIBANA_URL}${SPACE_URL}/api/cases/$CASE_ID" \
  | jq .;
  exit 1
fi

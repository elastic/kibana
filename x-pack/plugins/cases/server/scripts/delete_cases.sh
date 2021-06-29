#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Creates a new case and then gets it if no CASE_ID is specified

# Example:
# ./delete_cases.sh

# Example with CASE_ID args:
# ./delete_cases.sh 1234-example-id 5678-example-id

set -e
./check_env_variables.sh

if [ "$1" ]; then
  ALL=("$@")
  i=0

  COUNT=${#ALL[@]}
  IDS=""
  for ID in "${ALL[@]}"
  do
    let i=i+1
    if [ $i -eq $COUNT ]; then
      IDS+="%22${ID}%22"
    else
      IDS+="%22${ID}%22,"
    fi
  done

  curl -s -k \
   -H 'kbn-xsrf: 123' \
   -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
   -X DELETE "${KIBANA_URL}${SPACE_URL}/api/cases?ids=\[${IDS}\]" \
  | jq .;
  exit 1
else
  CASE_ID=("$(./generate_case_data.sh | jq '.id' -j)")
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X DELETE "${KIBANA_URL}${SPACE_URL}/api/cases?ids=\[%22${CASE_ID}%22\]" \
  | jq .;
  exit 1
fi

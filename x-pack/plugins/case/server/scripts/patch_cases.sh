#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
CASES=${1:-./mock/patch/cases.json}

# You will need to update the json each time with the new version id for this to work
# Example: ./patch_cases.sh
curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X PATCH ${KIBANA_URL}${SPACE_URL}/api/cases \
  -d @${CASES} \
  | jq .;

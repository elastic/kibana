#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# A new case will be generated and the title will be updated in the PATCH call
# Example:
# ./patch_cases.sh

set -e
./check_env_variables.sh

PATCH_CASE="$(./generate_case_data.sh | jq '{ cases: [{ id: .id, version: .version, title: "Change the title" }] }' -j)"

curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X PATCH ${KIBANA_URL}${SPACE_URL}/api/cases \
 -d "$PATCH_CASE" \
 | jq .;

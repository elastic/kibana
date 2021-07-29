#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# A new case and comment will be generated and the comment will be updated in the PATCH call
# Example:
# ./patch_comment.sh

set -e
./check_env_variables.sh

DATA="$(./generate_case_and_comment_data.sh | jq '{ caseId: .caseId, id: .commentId, version: .commentVersion, comment: "Update the comment" }' -j)"
CASE_ID=$(echo "${DATA}" | jq ".caseId" -j)
PATCH_COMMENT=$(echo "${DATA}" | jq 'del(.caseId)')

curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X PATCH "${KIBANA_URL}${SPACE_URL}/api/cases/$CASE_ID/comments" \
 -d "$PATCH_COMMENT" \
 | jq .;

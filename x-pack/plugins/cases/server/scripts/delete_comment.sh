#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Creates a new case and then gets it if no CASE_ID is specified

# Example:
# ./delete_comment.sh

# Example with CASE_ID and COMMENT_ID arg:
# ./delete_comment.sh 1234-example-case-id 5678-example-comment-id

set -e
./check_env_variables.sh


if [ "$1" ] && [ "$2" ]; then
  curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X DELETE "${KIBANA_URL}${SPACE_URL}/api/cases/$1/comments/$2" \
  | jq .;
  exit 1
else
  DATA="$(./generate_case_and_comment_data.sh | jq '{ caseId: .caseId, commentId: .commentId}' -j)"
  CASE_ID=$(echo $DATA | jq ".caseId" -j)
  COMMENT_ID=$(echo $DATA | jq ".commentId" -j)
  curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X DELETE "${KIBANA_URL}${SPACE_URL}/api/cases/$CASE_ID/comments/$COMMENT_ID" \
  | jq .;
  exit 1
fi
./delete_case.sh [b6766a90-6559-11ea-9fd5-b52942ab389a]

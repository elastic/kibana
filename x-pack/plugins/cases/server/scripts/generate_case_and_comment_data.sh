#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# returns case/comment data as { commentId, commentVersion, caseId, caseVersion }
# Example:
# ./generate_case_and_comment_data.sh

set -e
./check_env_variables.sh

COMMENT=(${1:-./mock/comment/post_comment.json})
CASE_ID=$(./post_case.sh | jq ".id" -j)

POSTED_COMMENT="$(curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/cases/$CASE_ID/comments" \
  -d @${COMMENT} \
  | jq '{ commentId: .comments[0].id, commentVersion: .comments[0].version }' \
-j)"
POSTED_CASE=$(./get_case.sh $CASE_ID | jq '{ caseId: .id, caseVersion: .version }' -j)

echo ${POSTED_COMMENT} ${POSTED_CASE} \
| jq -s add;

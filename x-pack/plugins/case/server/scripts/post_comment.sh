#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Example:
# ./post_comment.sh

# Example:
# ./post_comment.sh 92970bf0-64a7-11ea-9979-d394b1de38af ./mock/comment/post_comment.json

# Example glob:
# ./post_comment.sh 92970bf0-64a7-11ea-9979-d394b1de38af ./mock/comment/*

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
COMMENTS=(${2:-./mock/comment/post_comment.json})

if [ "$1" ]; then
  for COMMENT in "${COMMENTS[@]}"
    do {
      [ -e "$COMMENT" ] || continue
      curl -s -k \
      -H 'Content-Type: application/json' \
      -H 'kbn-xsrf: 123' \
      -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
      -X POST "${KIBANA_URL}${SPACE_URL}/api/cases/$1/comments" \
       -d @${COMMENT} \
      | jq .;
    } &
  done

  wait
  exit 1
else
  CASE_ID=("$(./generate_case_data.sh | jq '.id' -j)")
  for COMMENT in "${COMMENTS[@]}"
    do {
      [ -e "$COMMENT" ] || continue
      curl -s -k \
      -H 'Content-Type: application/json' \
      -H 'kbn-xsrf: 123' \
      -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
      -X POST "${KIBANA_URL}${SPACE_URL}/api/cases/$CASE_ID/comments" \
       -d @${COMMENT} \
      | jq .;
    } &
  done

  wait
  exit 1
fi

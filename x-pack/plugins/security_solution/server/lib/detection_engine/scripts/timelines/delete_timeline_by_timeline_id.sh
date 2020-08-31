#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh


# Example: ./timelines/delete_timeline_by_id.sh {timeline_id}

curl -s -k \
  -H "Content-Type: application/json" \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/solutions/security/graphql" \
  -d '{"operationName":"DeleteTimelineMutation","variables":{"id":["'$1'"]},"query":"mutation DeleteTimelineMutation($id: [ID!]!) {\n  deleteTimeline(id: $id)\n}\n"}'


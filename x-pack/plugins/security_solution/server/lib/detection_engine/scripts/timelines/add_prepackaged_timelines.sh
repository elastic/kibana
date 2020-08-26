#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a defaults if no argument is specified
TIMELINES=${1:-../../rules/prepackaged_timelines/index.ndjson}

# Example to import and overwrite everything from ../rules/prepackaged_timelines/index.ndjson
# ./timelines/add_prepackaged_timelines.sh
curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/timeline/_prepackaged" \
  | jq .

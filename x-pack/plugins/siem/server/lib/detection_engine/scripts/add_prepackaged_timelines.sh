#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a defaults if no argument is specified
TIMELINES=${1:-../rules/prepackaged_timelines/index.ndjson}

# Generate ndjson for prepackage timelines.
sh ./regen_prepackage_timelines_index.sh

# Example to import and overwrite everything from ./rules/prepackaged_timelines/index.ndjson
# ./import_rules.sh
curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/timeline/_import" \
  --form file=@${TIMELINES} \
  | jq .;

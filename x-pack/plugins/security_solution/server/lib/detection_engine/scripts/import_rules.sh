#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Uses a defaults if no argument is specified
RULES=${1:-./rules/import/multiple_ruleid_queries.ndjson}
OVERWRITE=${2:-true}

# Example to import and overwrite everything from ./rules/import/multiple_ruleid_queries.ndjson
# ./import_rules.sh

# Example to not overwrite everything if it exists from ./rules/import/multiple_ruleid_queries.ndjson
# ./import_rules.sh ./rules/import/multiple_ruleid_queries.ndjson false
curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules/_import?overwrite=${OVERWRITE}" \
  --form file=@${RULES} \
  | jq .;

#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

FILENAME=${1:-test.ndjson}
EXCLUDE_DETAILS=${2:-false}

# Example export to the file named test.ndjson
# ./export_rules_to_file.sh

# Example export to the file named test.ndjson with export details appended
# ./export_rules_to_file.sh test.ndjson false
curl -s -k -OJ \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules/_export?exclude_export_details=${EXCLUDE_DETAILS}&file_name=${FILENAME}"

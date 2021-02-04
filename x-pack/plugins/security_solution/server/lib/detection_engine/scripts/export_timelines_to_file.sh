#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

FILENAME=${1:-test_timeline.ndjson}

# Example export to the file named test_timeline.ndjson
# ./export_timelines_to_file.sh

# Example export to the file named my_test_timeline.ndjson
# ./export_timelines_to_file.sh my_test_timeline.ndjson
curl -s -k -OJ \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/timeline/_export?file_name=${FILENAME}"

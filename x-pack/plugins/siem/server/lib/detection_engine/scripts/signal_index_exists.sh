#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./signal_index_exists.sh
curl -s -k -f \
 -H 'Content-Type: application/json' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 ${KIBANA_URL}${SPACE_URL}/api/detection_engine/index > /dev/null

#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./get_alert_instances.sh
# https://github.com/elastic/kibana/blob/master/x-pack/plugins/alerts/README.md#get-apialert_find-find-alerts
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}${SPACE_URL}/api/alerts/_find \
  | jq .

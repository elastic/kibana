#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Example: ./get_saved_object.sh
# Example: ./get_saved_objects.sh alert 836dab88-edff-42a5-a219-4aae46fcd385
# https://www.elastic.co/guide/en/kibana/master/saved-objects-api-get.html
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}${SPACE_URL}/api/saved_objects/$1/$2 \
  | jq .

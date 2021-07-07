#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Uses a default if no argument is specified
FILE=${1:-./post_examples/one_module_auditbeat.json}

# Example: ./post_transforms.sh ./post_examples/one_module_auditbeat.json
# Example: ./post_transforms.sh ./post_examples/one_module_namespace_auditbeat.json
curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X POST ${KIBANA_URL}${SPACE_URL}/api/metrics_entities/transforms \
 -d @${FILE} \
 | jq .

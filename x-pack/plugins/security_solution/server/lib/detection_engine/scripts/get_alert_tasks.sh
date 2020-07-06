#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./get_alert_tasks.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/tasks.html 
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${ELASTICSEARCH_URL}/${TASK_MANAGER_INDEX}*/_search \
  --data '{
    "query": {
      "term" : { "task.taskType" : "alerting:siem.signals" }
    },
    "size": 100
    }
  ' \
| jq .

#!/bin/sh
#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

curl -X POST http://localhost:5601/${BASE_PATH}/api/alerts/alert \
     -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
     -H 'kbn-xsrf: true' \
     -H 'Content-Type: application/json' \
     --verbose \
     -d '
{
  "params":{
     "indexPatterns": ["*"],
     "customQuery": "*:*"
   },
   "consumer":"alerts",
   "alertTypeId":"siem.customRule",
   "schedule":{
      "interval":"1m"
   },
   "actions":[],
   "tags":[
      "custom",
      "persistence"
   ],
   "notifyWhen":"onActionGroupChange",
   "name":"Basic custom query rule"
}'



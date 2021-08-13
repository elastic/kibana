#!/bin/sh
#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

curl -X POST ${KIBANA_URL}${SPACE_URL}/api/alerts/alert \
     -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
     -H 'kbn-xsrf: true' \
     -H 'Content-Type: application/json' \
     --verbose \
     -d '
{
  "params":{
     "anomalyThreshold": 23
     "author": [],
     "description": "Basic Machine Learning rule",
     "exceptionsList": [],
     "falsePositives": [],
     "from": "now-300s",
     "immutable": false,
     "language": "kuery",
     "machineLearningJobId": "test-ml-job"
     "maxSignals": 10,
     "outputIndex": "",
     "references": [],
     "riskScore": 21,
     "riskScoreMapping": [],
     "ruleId": "91dec1ba-b779-469c-9667-6b0e865fb86b",
     "severity": "low",
     "severityMapping": [],
     "threat": [],
     "to": "now",
     "type": "machine_learning",
     "version": 1
   },
   "consumer":"alerts",
   "alertTypeId":"siem.mlRule",
   "schedule":{
      "interval":"1m"
   },
   "actions":[],
   "tags":[
      "custom",
      "persistence"
   ],
   "notifyWhen":"onActionGroupChange",
   "name":"Basic Machine Learning rule"
}'



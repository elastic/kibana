
#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./timelines/delete_all_timelines.sh
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${ELASTICSEARCH_URL}/${KIBANA_INDEX}*/_delete_by_query \
  --data '{
   "query" : {
     "bool": {
       "minimum_should_match": 1,
       "should": [
         {"exists" :{ "field": "siem-ui-timeline" }},
         {"exists" :{ "field": "siem-ui-timeline-note" }},
         {"exists" :{ "field": "siem-ui-timeline-pinned-event" }}
       ]
     }
   }
}' \
| jq .

#!/usr/bin/env bash

# manual tester for https://github.com/elastic/kibana/pull/159459

# requires hjson, jq
# - https://hjson.github.io/users-bin.html
# - https://stedolan.github.io/jq/download/

# by default, create 2 rules, overide with `RULES=200 test_pr_159459.sh``
rulesToCreate=${RULES:-2}

# label added to resource names
isoDate=`node -p "new Date().toISOString()"`
dateLabel=`node -p "new Date().toISOString().substr(5,14)"`

# ----- connector definition -----

connReq=`hjson -c << CONN_REQ
  name:              server log $dateLabel
  connector_type_id: .server-log
  config:            {}
  secrets:           {}
CONN_REQ`
# echo "connReq:" $connReq

# ----- rule definition -----

ruleReq=`hjson -c << RULE_REQ
{
  name:         metric threshold $dateLabel
  rule_type_id: metrics.alert.threshold
  consumer:     infrastructure
  enabled:      true
  throttle:     null
  schedule:     { interval: "1s" }
  actions:      [] # [{ group: "default", id: "$connId", params: { message: "{{context.message}}" } }]
  params: {
    criteria: [
      {
        metric:     kibana.alert.rule.execution.metrics.rule_type_run_duration_ms
        comparator: <
        threshold:  [ 100 ]
        timeSize:   1
        timeUnit:   m
        aggType:    avg
      }
    ]
    sourceId:              default
    alertOnNoData:         false
    alertOnGroupDisappear: false
  }
}
RULE_REQ`
#echo "ruleReq:" $ruleReq

# ----- add metrics-event-log alias for event log -----

aliasRes=`curl -sX POST $ES_URL/.kibana-event-log-*/_alias/metrics-event-log \
  -H 'kbn-xsrf: true'`
echo "aliasRes:" $aliasRes

# ----- create connector -----

# connRes=`curl -sX POST $KB_URL/api/actions/connector \
#   -H 'kbn-xsrf: true' \
#   -H 'Content-Type: application/json' \
#   -d "$connReq"`
# # echo "connRes:" $connRes
# 
# connId=`echo $connRes | jq -r '.id'`
# echo "connId:" $connId

# ----- create rules -----

echo "creating $rulesToCreate rules"
for (( i=1; i<=$rulesToCreate; i++ ))
do
  echo "creating rule $i / $rulesToCreate"

  ruleRes=`curl -sX POST $KB_URL/api/alerting/rule \
    -H 'kbn-xsrf: true' \
    -H 'Content-Type: application/json' \
    -d "$ruleReq"`
  echo "ruleRes:" $ruleRes

  ruleId=`echo $ruleRes | jq -r '.id'`
  echo "ruleId:" $ruleId

done

# ----- collect stats -----

echo "collect stats ..."

# do forever ...
# - get stats via curl $KB_URL/internal/task_manager/_background_task_utilization | json

while true 
do 
  btuRes=`curl -s $KB_URL/api/task_manager/_background_task_utilization`
  # echo "btuRest:" $btuRes
  btu=`echo $btuRes | jq -r '.stats.value.load'`
  echo "btu:" $btu
  sleep 1
done



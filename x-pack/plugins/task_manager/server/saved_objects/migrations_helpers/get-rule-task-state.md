#!/usr/bin/env npx zx

get-rule-task-state.md
========================================================================

This script will create a metric threshold and index threshold rule,
for the purposes of looking at their task state.  And then provides
some commands to dump the task state for them.

Used to get data for a migration test.  

It just needs to have a recent version of node/npm/npx installed,
no other pre-reqs. See [`zx`](https://github.com/google/zx#readme) 
for more details.

This should show two alerts for both rules.  For more alerts per
rule, run more rules - like running this script again.


pre-reqs
------------------------------------------------------------------------

- env var `$KBN_URL` should be set to your Kibana URL, with user/pass.
- env var `$ES_URL`  should be set to your Elasticsearch URL, with user/pass.


initialize the script
------------------------------------------------------------------------

```js
    const https = require('node:https')

    $.verbose = false

    const KBN_URL = process.env.KBN_URL
    const ES_URL  = process.env.ES_URL
```

create an alias to the .kibana-event-log-* for o11y metrics
------------------------------------------------------------------------

```js
    const eventLog = '.kibana-event-log-*'
    const eventMetrics = 'metrics-kibana-event-log'
    const alias = await postURL(`${ES_URL}/${eventLog}/_alias/${eventMetrics}`)
    console.log(`alias for o11y metrics:   ${JSON.stringify(alias)}`)
```

create server log connector
------------------------------------------------------------------------

```js
    const createConnPayload = {
      name: 'server log for rule-task-state',
      connector_type_id: '.server-log',
    };

    const conn = await postURL(`${KBN_URL}/api/actions/connector`, createConnPayload);
    console.log(`server log id:            ${conn.id}`);
```


create rules
------------------------------------------------------------------------

```js
    const mtRule = await postURL(`${KBN_URL}/api/alerting/rule`, getMtRulePayload());
    console.log(`metric threshold rule id: ${mtRule.id}`);

    const itRule = await postURL(`${KBN_URL}/api/alerting/rule`, getItRulePayload());
    console.log(`index  threshold rule id: ${itRule.id}`);
```

get task docs
------------------------------------------------------------------------

```js
    const SLEEP = 5;
    console.log('');
    console.log(`waiting for ${SLEEP} seconds for the rules to run ...`);
    await sleep(SLEEP * 1000);

    const fullTask = getTask(mtRule.id);
    const { task: mtTask, ruleState: mtRuleState } = await getTask(mtRule.id);
    console.log('');
    console.log(`metric threshold task state: ${JSON.stringify(mtTask._source, null, 4)}`);
    console.log(`rule state: : ${JSON.stringify(mtRuleState, null, 4)}`);

    const { task: itTask, ruleState: itRuleState } = await getTask(mtRule.id);
    console.log('');
    console.log(`index threshold task state: ${JSON.stringify(itTask._source, null, 4)}`);
    console.log(`rule state: : ${JSON.stringify(itRuleState, null, 4)}`);
```


etc
------------------------------------------------------------------------

```js
function getMtRulePayload() {
  return {
    consumer: 'infrastructure',
    name: 'rule-mt',
    schedule: {
      interval: '3s',
    },
    params: {
      criteria: [
        {
          aggType: 'avg',
          comparator: '>',
          threshold: [0],
          timeSize: 5,
          timeUnit: 'm',
          metric: 'kibana.alert.rule.execution.metrics.total_run_duration_ms',
        },
      ],
      sourceId: 'default',
      alertOnNoData: true,
      alertOnGroupDisappear: true,
      groupBy: ['rule.id'],
    },
    rule_type_id: 'metrics.alert.threshold',
    notify_when: 'onActiveAlert',
    actions: [
      {
        group: 'metrics.threshold.fired',
        id: conn.id,
        params: {
          message:
            '{{alertName}} - {{context.group}} is in a state of {{context.alertState}}\n\nReason:\n{{context.reason}}\n',
        },
      },
    ],
  };
}

function getItRulePayload() {
  return {
    rule_type_id: '.index-threshold',
    name: 'rule-it',
    notify_when: 'onActiveAlert',
    consumer: 'alerts',
    schedule: { interval: '3s' },
    actions: [
      {
        group: 'threshold met',
        id: conn.id,
        params: { message: '{{context.message}}' },
      },
    ],
    params: {
      index: ['.kibana-event-log-*'],
      timeField: '@timestamp',
      aggType: 'avg',
      aggField: 'kibana.alert.rule.execution.metrics.total_run_duration_ms',
      groupBy: 'top',
      termSize: 100,
      termField: 'rule.id',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: '>',
      threshold: [0],
    },
  };
}

/** @type { (id: string) => Promise<any> } */
async function getTask(id) {
  while (true) {
    await getURL(`${ES_URL}/_refresh`);

    const task = await getURL(`${ES_URL}/.kibana_task_manager/_doc/task:${id}`);
    const ruleStateJ = task._source.task.state;

    const ruleState = JSON.parse(ruleStateJ);
    if (Object.keys(ruleState.alertInstances).length !== 0) {
      return { task, ruleState };
    }

    console.log(`waiting another second for the rules to run ...`);
    await sleep(1000);
  }
}

async function getURL(url) {
  return sendURL(url, 'GET')
}

async function postURL(url, body) {
  return sendURL(url, 'POST', body)
}

async function sendURL(urlWithPass, method, body) {
  const purl = new URL(urlWithPass)
  const userPass = `${purl.username}:${purl.password}`
  const userPassEn = Buffer.from(userPass).toString('base64')
  const auth = `Basic ${userPassEn}`
  const url = `${purl.origin}${purl.pathname}${purl.search}`
  const headers = {
    'content-type': 'application/json',
    'kbn-xsrf': 'foo',
    'authorization': auth,
  }

  const fetchOptions = { method, headers }
  if (body) fetchOptions.body = JSON.stringify(body)

  if (purl.protocol === 'https:') {
    fetchOptions.agent = new https.Agent({ rejectUnauthorized: false })
  }

  // console.log(`fetch("${url}", ${JSON.stringify(fetchOptions, null, 4)}`)
  const response = await fetch(url, fetchOptions)
  const object = await response.json()
  // console.log(`fetch(...): ${JSON.stringify(object, null, 4)}`)
  return object
}
```

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let Alerts = {
  register(template: any) {
    // destroy
    return template;
  },
  create(template: any) {
    // create
    return template;
  },
  schedule(template: any) {
    // schedule
    return template;
  },
  registerUI(uiComponent: any) {
    return uiComponent;
  },
};

const elasticsearch = {
  query(context: any) {
    return context;
  },
};

Alerts.register({
  id: 'cpu_threshold_alert',
  param_schema: {
    index: { required: true, type: 'string' },
    thresholds: {
      gt: { required: false, type: 'number' },
      lte: { required: false, type: 'number' },
    },
    hook_url: { required: true, type: 'string' },
    notifications: { required: true, type: 'string' },
    type: { required: true, type: 'string' },
    params: {
      type: 'action_schema:{type}',
      required: true,
    },
  },
  ttype: {
    required: true,
    type: 'string',
  },
  params: {
    type: 'action_schema:{type}',
    required: true,
  },
  uiHints: {
    short_message: 'Cpu usage is {value} which is over the threshold {threshold}',
  },
  run({ actions, state, params }) {
    const results = elasticsearch.query(params.index, state.scroll_id);

    if (results.cpu_usage > params.threshold) {
      actions.fire('over threshold notification', params.notifications.params);

      // How do we do this only the first time this condition is met
      actions.fire('alert_1_rest_hook', 'get_request', params.hook_url);
    }

    return {
      state,
    };
  },
});

// client-side
Alerts.registerUI({
  register_id: 'cpu_threshold_alert',
  render({ dom, props, done }) {
    return arguments;
  },
});

// client-side
// <ConfigureSlackNotification=Alert.get("cpu_threshold_alert") />
// <ConfigureEmailNotification=Alert.get("cpu_threshold_alert") />

Alerts.create({
  id: 'Nicks cpu threshold alert',
  register_id: 'cpu_threshold_alert_slack',
  params: {
    // customized by the user
    index: 'cpu_monitoring_index',
    threshold: {
      gte: '50',
      lt: '80',
    },
    notification: {
      type: 'slack',
      params: {
        room: 'kibana',
        message: 'Cpu usage is {value} which is over the threshold {threshold}',
      },
    },
  },
});

Alerts.create({
  id: 'Nicks cpu threshold alert',
  register_id: 'cpu_threshold_alert_phoneme',
  params: {
    // customized by the user
    index: 'cpu_monitoring_index',
    state: {},
    threshold: {
      gte: '80',
    },
    notification: {
      type: 'twillio',
      params: {
        phone: '555-867-5309',
        text_to_speech: 'Cpu usage is {value} which is over the threshold {threshold}',
      },
    },
  },
});

const Actions = {
  registerBackend(context: any) {
    return context;
  },
  register(context: any) {
    return context;
  },
};

Actions.registerBackend({
  id: 'slack',
  implements: ['notification'],
  initParams: {
    url: { type: 'url', required: true },
    username: { type: 'secret', required: true },
    password: { type: 'secret', required: true },
    room: { type: 'string', required: true, name: 'Room name' },
  },
  fireParams: {
    message: { type: 'string', required: true },
    image: { type: 'blob', required: false },
  },
  fire(params: any) {
    return params;
  },
});

// User uses UI to register a Slack room

Actions.register({
  name: 'Slack #marketing',
  id: 'slack#marketing',
  space: 'marketing',
  backend_id: 'slack',
  initParams: {
    url: 'http://slack.com',
    username: 'clint',
    password: 'mypass',
    room: '#marketing',
  },
});

// A task template provided by the Watcher/Alerting plugin

Alerts.register({
  id: 'watcher:threshold_alert',
  desc: 'Alert when an aggregation metric passes a specified threshold',
  executeParams: {
    search: { type: 'object', required: true, name: 'Search request' },
    metric: { type: 'string', required: true, name: 'Metric path' },
    threshold: { type: 'number', required: true, name: 'Threshold value' },
    comparator: { type: 'comparison', required: true, name: 'Threshold comparison' },
    // e.g. "options": [{ "lt": "<"}, {"lte": "<="}, {"eq": "=="}, {"gte": ">="}, {"gt": ">"}],
    title: { type: 'string', default: 'Threshold for {params.metric} exceeded' },
    content: {
      type: 'string',
      default:
        'Threshold for {params.metric} exceeded, current value { vars.value }, threshold { params.threshold }',
    },
    action: { type: 'action:notification', required: false, name: 'Notification action' },
  },
  execute(ctx, params) {
    const params = ctx.params;
    const r = ctx.helper.render;

    ctx.log.info(r('Running search request for { ctx.meta.task_id }'), params.search);

    const result = ctx.es.search(params.search);
    ctx.log.debug('Results of search request', result);

    const value = ctx.helper.path(result, 'aggregations.' + params.metric);
    ctx.log.debug(r('Value of metric {params.metric}:'), value);

    if (value === null) {
      const error = r('Metric {params.metric} not found');
      ctx.log('error', error);
      ctx.task.set_status('error', error);
      return;
    }

    if (!ctx.helper.compare(params.comparator, value, params.threshold)) {
      ctx.log('All OK');
      ctx.task.set_status('ok');
      return;
    }

    ctx.log.warning(params.content);
    ctx.task.set_status('firing');
    if (params.action) {
      params.action.fire_throttled(ctx, {
        title: r(params.title),
        content: r(params.content),
      });
    }
  },
});

// The user interacts with the Alerting UI to set up this threshold alert:

Alerts.schedule({
  id: 'check_sales',
  schedule: '* 0 * * *',
  task_id: 'watcher:threshold_alert',
  space: 'marketing',
  user: 'clint',
  executionParams: {
    search: { index: 'foo', body: {} },
    metric: 'hourly.sales.sum',
    threshold: 100,
    comparator: '<=',
    action: 'slack#marketing',
  },
});

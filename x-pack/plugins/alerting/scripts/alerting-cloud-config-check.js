#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// keys we're interested in
const keyPrefixes = [
  'xpack.actions.',
  'xpack.alerts.',
  'xpack.alerting.',
  'xpack.event_log.',
  'xpack.ruleRegistry.',
  'xpack.task_manager.',
];

// files for cloud
const cloudFiles = [`alerting.yml`, `kibana.yml`, `task_manager.yml`];

const { report } = require('./lib/cloud-config-check');

async function main() {
  await report({ keyPrefixes, cloudFiles });
}

main();

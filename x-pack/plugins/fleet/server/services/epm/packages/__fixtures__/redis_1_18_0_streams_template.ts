/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const REDIS_ASSETS_MAP = new Map([
  [
    'redis-1.18.0/data_stream/slowlog/agent/stream/stream.yml.hbs',
    Buffer.from(`hosts:
{{#each hosts as |host i|}}
 - {{host}}
{{/each}}
password: {{password}}
{{#if processors}}
processors:
{{processors}}
{{/if}}
`),
  ],
  [
    'redis-1.18.0/data_stream/log/agent/stream/stream.yml.hbs',
    Buffer.from(`paths:
{{#each paths as |path i|}}
 - {{path}}
{{/each}}
tags:
{{#if preserve_original_event}}
  - preserve_original_event
{{/if}}
{{#each tags as |tag i|}}
  - {{tag}}
{{/each}}
{{#contains "forwarded" tags}}
publisher_pipeline.disable_host: true
{{/contains}}
exclude_files: [".gz$"]
exclude_lines: ["^\\s+[\\-\`('.|_]"]  # drop asciiart lines\n
{{#if processors}}
processors:
{{processors}}
{{/if}}
`),
  ],
  [
    'redis-1.18.0/data_stream/key/agent/stream/stream.yml.hbs',
    Buffer.from(`metricsets: ["key"]
hosts:
{{#each hosts}}
  - {{this}}
{{/each}}
{{#if idle_timeout}}
idle_timeout: {{idle_timeout}}
{{/if}}
{{#if key.patterns}}
key.patterns: {{key.patterns}}
{{/if}}
{{#if maxconn}}
maxconn: {{maxconn}}
{{/if}}
{{#if network}}
network: {{network}}
{{/if}}
{{#if username}}
username: {{username}}
{{/if}}
{{#if password}}
password: {{password}}
{{/if}}
{{#if ssl}}
{{ssl}}
{{/if}}
period: {{period}}
{{#if processors}}
processors:
{{processors}}
{{/if}}
tags:
  - test
{{#each tags as |tag i|}}
  - {{tag}}
{{/each}}
tags_streams: 
{{#each tags_streams as |tag i|}}
  - {{tag}}
{{/each}}
`),
  ],
]);

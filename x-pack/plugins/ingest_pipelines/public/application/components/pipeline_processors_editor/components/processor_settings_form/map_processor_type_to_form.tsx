/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FunctionComponent } from 'react';
import { SetProcessor } from './processors/set';
import { Gsub } from './processors/gsub';

/**
 * Map that accepts an ES processor type name and returns either the component
 * for rendering the associated fields for configuring the processor or the path
 * link that will be used in help text.
 *
 * In Chrome, and possibly other browsers, the order of the keys determines the order
 * in the rendered list.
 */
const mapProcessorTypeToFormOrDocPath: Record<string, FunctionComponent | string> = {
  append: '/append-processor.html', // TODO: Implement
  bytes: '/bytes-processor.html', // TODO: Implement
  circle: '/ingest-circle-processor.html', // TODO: Implement
  convert: '/convert-processor.html', // TODO: Implement
  csv: '/csv-processor.html', // TODO: Implement
  date: '/date-processor.html', // TODO: Implement
  date_index_name: '/date-index-name-processor.html', // TODO: Implement
  dissect: '/dissect-processor.html', // TODO: Implement
  dot_expander: '/dot-expand-processor.html', // TODO: Implement
  drop: '/drop-processor.html', // TODO: Implement
  enrich: '/enrich-processor.html', // TODO: Implement
  fail: '/fail-processor.html', // TODO: Implement
  foreach: '/foreach-processor.html', // TODO: Implement
  geoip: '/geoip-processor.html', // TODO: Implement
  grok: '/grok-processor.html', // TODO: Implement

  gsub: '/gsub-processor.html',

  html_strip: '/htmlstrip-processor.html', // TODO: Implement
  inference: '/inference-processor.html', // TODO: Implement
  join: '/join-processor.html', // TODO: Implement
  json: '/json-processor.html', // TODO: Implement
  kv: '/kv-processor.html', // TODO: Implement
  lowercase: '/lowercase-processor.html', // TODO: Implement
  pipeline: '/pipeline-processor.html', // TODO: Implement
  remove: '/remove-processor.html', // TODO: Implement
  rename: '/rename-processor.html', // TODO: Implement
  script: '/script-processor.html', // TODO: Implement

  set: '/set-processor.html',

  set_security_user: '/ingest-node-set-security-user-processor.html', // TODO: Implement
  split: '/split-processor.html', // TODO: Implement
  sort: '/sort-processor.html', // TODO: Implement
  trim: '/trim-processor.html', // TODO: Implement
  uppercase: '/uppercase-processor.html', // TODO: Implement
  urldecode: '/urldecode-processor.html', // TODO: Implement
  user_agent: '/user-agent-processor.html', // TODO: Implement
};

export const types = Object.keys(mapProcessorTypeToFormOrDocPath);

export type ProcessorType = keyof typeof mapProcessorTypeToFormOrDocPath;

export const getProcessorFormOrDocPath = (
  type: ProcessorType | string
): FunctionComponent | string | undefined => {
  return mapProcessorTypeToFormOrDocPath[type as ProcessorType];
};

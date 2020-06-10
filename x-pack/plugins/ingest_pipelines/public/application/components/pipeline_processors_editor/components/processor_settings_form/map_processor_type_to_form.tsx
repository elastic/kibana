/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FunctionComponent } from 'react';

// import { SetProcessor } from './processors/set';
// import { Gsub } from './processors/gsub';

const mapProcessorTypeToForm = {
  append: undefined, // TODO: Implement
  bytes: undefined, // TODO: Implement
  circle: undefined, // TODO: Implement
  convert: undefined, // TODO: Implement
  csv: undefined, // TODO: Implement
  date: undefined, // TODO: Implement
  date_index_name: undefined, // TODO: Implement
  dissect: undefined, // TODO: Implement
  dot_expander: undefined, // TODO: Implement
  drop: undefined, // TODO: Implement
  enrich: undefined, // TODO: Implement
  fail: undefined, // TODO: Implement
  foreach: undefined, // TODO: Implement
  geoip: undefined, // TODO: Implement
  grok: undefined, // TODO: Implement
  gsub: undefined,
  html_strip: undefined, // TODO: Implement
  inference: undefined, // TODO: Implement
  join: undefined, // TODO: Implement
  json: undefined, // TODO: Implement
  kv: undefined, // TODO: Implement
  lowercase: undefined, // TODO: Implement
  pipeline: undefined, // TODO: Implement
  remove: undefined, // TODO: Implement
  rename: undefined, // TODO: Implement
  script: undefined, // TODO: Implement
  set: undefined,
  set_security_user: undefined, // TODO: Implement
  split: undefined, // TODO: Implement
  sort: undefined, // TODO: Implement
  trim: undefined, // TODO: Implement
  uppercase: undefined, // TODO: Implement
  urldecode: undefined, // TODO: Implement
  user_agent: undefined, // TODO: Implement
};

export const types = Object.keys(mapProcessorTypeToForm);

export type ProcessorType = keyof typeof mapProcessorTypeToForm;

export const getProcessorForm = (type: string): FunctionComponent | undefined => {
  return mapProcessorTypeToForm[type as ProcessorType];
};

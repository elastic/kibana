/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FunctionComponent } from 'react';

import { SetProcessor } from './processors/set';
import { Gsub } from './processors/gsub';

const mapProcessorTypeToForm = {
  set: SetProcessor,
  gsub: Gsub,
};

export const types = Object.keys(mapProcessorTypeToForm);

export type ProcessorType = keyof typeof mapProcessorTypeToForm;

export const getProcessorForm = (type: string): FunctionComponent => {
  return mapProcessorTypeToForm[type as ProcessorType];
};

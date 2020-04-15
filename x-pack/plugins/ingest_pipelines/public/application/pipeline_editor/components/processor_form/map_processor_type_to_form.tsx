/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorFormDescriptor } from './types';

import * as setForm from './processors/set';

const mapProcessorTypeToForm = {
  set: setForm,
};

type ProcessorType = keyof typeof mapProcessorTypeToForm;

export const getProcessorFormDescriptor = (type: string): ProcessorFormDescriptor => {
  return mapProcessorTypeToForm[type as ProcessorType];
};

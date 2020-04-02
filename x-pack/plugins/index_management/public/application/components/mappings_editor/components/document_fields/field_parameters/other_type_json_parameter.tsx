/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { getFieldConfig } from '../../../lib';
import { UseField, JsonEditorField } from '../../../shared_imports';

export const OtherTypeJsonParameter = () => (
  <UseField
    path="otherTypeJson"
    config={getFieldConfig('otherTypeJson')}
    component={JsonEditorField}
  />
);

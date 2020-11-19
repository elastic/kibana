/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { RuntimeTypeParameter, PainlessScriptParameter } from '../../field_parameters';
import { BasicParametersSection } from '../edit_field';

export const RuntimeType = () => {
  return (
    <BasicParametersSection>
      <RuntimeTypeParameter stack={true} />
      <PainlessScriptParameter stack={true} />
    </BasicParametersSection>
  );
};

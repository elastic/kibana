/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { Forms } from '../../../../shared_imports';
import { WizardContent } from '../template_form';
import { StepMappings } from './step_mappings';

export const StepMappingsContainer = () => {
  const { defaultValue, updateContent, getData } = Forms.useContent<WizardContent>('mappings');

  return (
    <StepMappings
      defaultValue={defaultValue}
      onChange={updateContent}
      indexSettings={getData().settings}
    />
  );
};

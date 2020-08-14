/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { Forms } from '../../../../../shared_imports';
import { CommonWizardSteps } from './types';
import { StepSettings } from './step_settings';

interface Props {
  esDocsBase: string;
}

export const StepSettingsContainer = React.memo(({ esDocsBase }: Props) => {
  const { defaultValue, updateContent } = Forms.useContent<CommonWizardSteps, 'settings'>(
    'settings'
  );

  return (
    <StepSettings defaultValue={defaultValue} onChange={updateContent} esDocsBase={esDocsBase} />
  );
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Forms } from '../../../../../shared_imports';
import { TemplateDeserialized } from '../../../../../../common';
import { WizardContent } from '../../../template_form/template_form';
import { CommonWizardSteps } from './types';
import { StepSettings } from './step_settings';

interface Props {
  esDocsBase: string;
  getTemplateData?: (wizardContent: WizardContent) => TemplateDeserialized;
}

export const StepSettingsContainer = React.memo(({ esDocsBase, getTemplateData }: Props) => {
  const { defaultValue, updateContent } = Forms.useContent<CommonWizardSteps, 'settings'>(
    'settings'
  );
  const { getData } = Forms.useMultiContentContext<WizardContent>();

  let indexMode;
  if (getTemplateData) {
    const wizardContent = getData();
    // Build the current template object, providing the wizard content data
    const template = getTemplateData(wizardContent);
    indexMode = template.indexMode;
  }

  return (
    <StepSettings
      defaultValue={defaultValue}
      onChange={updateContent}
      esDocsBase={esDocsBase}
      indexMode={indexMode}
    />
  );
});

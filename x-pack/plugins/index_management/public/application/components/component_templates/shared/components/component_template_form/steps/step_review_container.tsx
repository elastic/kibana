/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { Forms, ComponentTemplateDeserialized } from '../../../../shared_imports';
import { WizardContent, WizardSection } from '../component_template_form';
import { StepReview } from './step_review';

interface Props {
  getTemplateData: (wizardContent: WizardContent) => ComponentTemplateDeserialized;
}

export const StepReviewContainer = React.memo(({ getTemplateData }: Props) => {
  const { navigateToStep } = Forms.useFormWizardContext<WizardSection>();
  const { getData } = Forms.useMultiContentContext<WizardContent>();

  const wizardContent = getData();
  // Build the final template object, providing the wizard content data
  const template = getTemplateData(wizardContent);

  return <StepReview template={template} navigateToStep={navigateToStep} />;
});

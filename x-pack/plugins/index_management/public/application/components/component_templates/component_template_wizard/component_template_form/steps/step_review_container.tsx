/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { Forms, ComponentTemplateDeserialized } from '../../../shared_imports';
import { WizardContent } from '../component_template_form';
import { StepReview } from './step_review';

interface Props {
  getComponentTemplateData: (wizardContent: WizardContent) => ComponentTemplateDeserialized;
}

export const StepReviewContainer = React.memo(({ getComponentTemplateData }: Props) => {
  const { getData } = Forms.useMultiContentContext<WizardContent>();

  const wizardContent = getData();
  // Build the final template object, providing the wizard content data
  const componentTemplate = getComponentTemplateData(wizardContent);

  return <StepReview componentTemplate={componentTemplate} />;
});

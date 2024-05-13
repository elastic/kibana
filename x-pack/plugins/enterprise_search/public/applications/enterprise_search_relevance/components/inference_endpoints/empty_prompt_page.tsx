/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AddEmptyPrompt } from '../../../shared/add_empty_prompt_for_inference_endpoint/add_empty_prompt';
import { EnterpriseSearchRelevancePageTemplate } from '../layout/page_template';

interface EmptyPromptPageProps {
  addEndpointLabel: string;
  breadcrumbs: string[];
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const EmptyPromptPage: React.FC<EmptyPromptPageProps> = ({
  addEndpointLabel,
  breadcrumbs,
  setIsInferenceFlyoutVisible,
}) => (
  <EnterpriseSearchRelevancePageTemplate
    pageChrome={breadcrumbs}
    pageViewTelemetry="Inference Endpoints"
    isLoading={false}
  >
    <AddEmptyPrompt
      addEndpointLabel={addEndpointLabel}
      setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
    />
  </EnterpriseSearchRelevancePageTemplate>
);

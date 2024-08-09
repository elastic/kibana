/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import * as i18n from '../../common/translations';
import { docLinks } from '../../common/doc_links';
import { useTrainedModelPageUrl } from '../hooks/use_trained_model_page_url';

export const InferenceEndpointsHeader: React.FC = () => {
  const trainedModelPageUrl = useTrainedModelPageUrl();

  return (
    <EuiPageTemplate.Header
      data-test-subj="allInferenceEndpointsPage"
      pageTitle={i18n.INFERENCE_ENDPOINT_LABEL}
      description={
        <EuiText>
          <p>
            {i18n.MANAGE_INFERENCE_ENDPOINTS_LABEL}
            <EuiSpacer size="s" />
            <EuiLink
              href={docLinks.createInferenceEndpoint}
              target="_blank"
              data-test-subj="learn-how-to-create-inference-endpoints"
            >
              {i18n.LEARN_HOW_TO_CREATE_INFERENCE_ENDPOINTS_LINK}
            </EuiLink>
          </p>
        </EuiText>
      }
      bottomBorder={true}
      rightSideItems={[
        <EuiLink href={trainedModelPageUrl} target="_blank" data-test-subj="view-your-models">
          {i18n.VIEW_YOUR_MODELS_LINK}
        </EuiLink>,
      ]}
    />
  );
};

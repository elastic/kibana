/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface InferenceEndpointsHeaderProps {
  addEndpointLabel: string;
  setIsInferenceFlyoutVisible: (isVisible: boolean) => void;
}

export const InferenceEndpointsHeader: React.FC<InferenceEndpointsHeaderProps> = ({
  addEndpointLabel,
  setIsInferenceFlyoutVisible,
}) => (
  <EuiPageTemplate.Header
    css={{ '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' } }}
    data-test-subj="allInferenceEndpointsPage"
    pageTitle={i18n.translate(
      'xpack.searchInferenceEndpoints.inferenceEndpoints.allInferenceEndpoints.title',
      {
        defaultMessage: 'Inference endpoints',
      }
    )}
    description={i18n.translate(
      'xpack.searchInferenceEndpoints.inferenceEndpoints.allInferenceEndpoints.description',
      {
        defaultMessage: 'Manage your inference endpoints.',
      }
    )}
    rightSideItems={[
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>
          <EuiButton
            key="newInferenceEndpoint"
            color="primary"
            iconType="plusInCircle"
            data-test-subj="addEndpointButtonForAllInferenceEndpoints"
            fill
            onClick={() => setIsInferenceFlyoutVisible(true)}
          >
            {addEndpointLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>,
    ]}
  />
);

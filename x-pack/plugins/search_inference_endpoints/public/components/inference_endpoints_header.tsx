/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import * as i18n from '../../common/translations';

interface InferenceEndpointsHeaderProps {
  setIsInferenceFlyoutVisible: (isVisible: boolean) => void;
}

export const InferenceEndpointsHeader: React.FC<InferenceEndpointsHeaderProps> = ({
  setIsInferenceFlyoutVisible,
}) => (
  <EuiPageTemplate.Header
    css={{ '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' } }}
    data-test-subj="allInferenceEndpointsPage"
    pageTitle={i18n.INFERENCE_ENDPOINT_LABEL}
    description={i18n.MANAGE_INFERENCE_ENDPOINTS_LABEL}
    bottomBorder={true}
    rightSideItems={[
      <EuiButton
        key="newInferenceEndpoint"
        color="primary"
        iconType="plusInCircle"
        data-test-subj="addEndpointButtonForAllInferenceEndpoints"
        fill
        onClick={() => setIsInferenceFlyoutVisible(true)}
      >
        {i18n.ADD_ENDPOINT_LABEL}
      </EuiButton>,
    ]}
  />
);

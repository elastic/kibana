/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

interface TabularPageProps {
  addEndpointLabel: string;
  breadcrumbs: string[];
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const TabularPage: React.FC<TabularPageProps> = ({
  addEndpointLabel,
  breadcrumbs,
  setIsInferenceFlyoutVisible,
}) => (
  <EnterpriseSearchContentPageTemplate
    pageChrome={breadcrumbs}
    pageViewTelemetry="Inference Endpoints"
    isLoading={false}
    pageHeader={{
      description: i18n.translate('xpack.enterpriseSearch.content.inferenceEndpoints.description', {
        defaultMessage:
          'Manage your Elastic and third-party endpoints generated from the Inference API.',
      }),
      pageTitle: i18n.translate('xpack.enterpriseSearch.inferenceEndpoints.title', {
        defaultMessage: 'Inference endpoints',
      }),
      rightSideGroupProps: {
        gutterSize: 's',
        responsive: false,
      },
      rightSideItems: [
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem>
            <EuiButton
              data-test-subj="entSearchContent-inferenceEndpoints-addButton"
              key="newInferenceEndpoint"
              color="primary"
              iconType="plusInCircle"
              fill
              onClick={() => setIsInferenceFlyoutVisible(true)}
            >
              {addEndpointLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>,
      ],
    }}
  />
);

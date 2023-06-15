/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSteps, EuiText, EuiTitle } from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const steps: EuiContainedStepProps[] = [
  {
    title: i18n.translate('xpack.enterpriseSearch.esre.measurePerformanceSection.step1.title', {
      defaultMessage: 'Create a collection',
    }),
    children: (
      <FormattedMessage
        id="xpack.enterpriseSearch.esre.measurePerformanceSection.step1.description"
        defaultMessage="Visit Behavioral Analytics and create your first collection"
      />
    ),
    status: 'incomplete',
  },
  {
    title: i18n.translate('xpack.enterpriseSearch.esre.measurePerformanceSection.step2.title', {
      defaultMessage: 'Integrate the analytics tracker',
    }),
    children: (
      <FormattedMessage
        id="xpack.enterpriseSearch.esre.measurePerformanceSection.step2.description"
        defaultMessage="After creating a collection, follow the directions on how to integrate our tracker into your application or website."
      />
    ),
    status: 'incomplete',
  },
  {
    title: i18n.translate('xpack.enterpriseSearch.esre.measurePerformanceSection.step3.title', {
      defaultMessage: 'Review your dashboard',
    }),
    children: (
      <FormattedMessage
        id="xpack.enterpriseSearch.esre.measurePerformanceSection.step3.description"
        defaultMessage="Our dashboards and tools help you visualize your end-user behavior and measure the performance of your search applications."
      />
    ),
    status: 'incomplete',
  },
];

export const MeasurePerformanceSection: React.FC = () => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem grow={4}>
      <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.esre.measurePerformanceSection.title"
                defaultMessage="Measure your performance"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.esre.measurePerformanceSection.description"
                defaultMessage="Use Behavioral Analytics dashboards and tools to visualize user behavior and measure the impact of your changes."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={6}>
      <EuiPanel hasBorder>
        <EuiSteps steps={steps} titleSize="xs" />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);

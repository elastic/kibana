/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import { ESDeprecationStats } from './es_stats';
import { KibanaDeprecationStats } from './kibana_stats';

const i18nTexts = {
  reviewStepTitle: i18n.translate('xpack.upgradeAssistant.overview.reviewStepTitle', {
    defaultMessage: 'Review deprecated settings and resolve issues',
  }),
};

export const getReviewLogsStep = ({ nextMajor }: { nextMajor: number }): EuiStepProps => {
  return {
    title: i18nTexts.reviewStepTitle,
    status: 'incomplete',
    children: (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.resolveStepDescription"
              defaultMessage="Update your Elasticsearch and Kibana deployments to be compatible with {nextMajor}.0. Critical issues must be resolved before you upgrade."
              values={{ nextMajor }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <ESDeprecationStats />
          </EuiFlexItem>

          <EuiFlexItem>
            <KibanaDeprecationStats />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    ),
  };
};

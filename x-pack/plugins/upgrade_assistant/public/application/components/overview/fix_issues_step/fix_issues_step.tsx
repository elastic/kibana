/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';

import { EuiText, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import { ESDeprecationStats } from './es_stats';
import { KibanaDeprecationStats } from './kibana_stats';
import type { OverviewStepsProps } from '../../types';

import './_fix_issues_step.scss';

const i18nTexts = {
  reviewStepTitle: i18n.translate('xpack.upgradeAssistant.overview.fixIssuesStepTitle', {
    defaultMessage: 'Review deprecated settings and resolve issues',
  }),
};

interface Props extends OverviewStepsProps {
  nextMajor: number;
}

const initialIssuesMap = {
  kibana: null,
  es: null,
};

const FixIssuesStep: FunctionComponent<OverviewStepsProps> = ({ setIsComplete }) => {
  const [criticalIssuesCount, setCriticalIssuesCount] = useState(initialIssuesMap);
  const setCriticalIssuesCountFor = (key: keyof typeof initialIssuesMap, count: number) => {
    setCriticalIssuesCount({
      ...criticalIssuesCount,
      [key]: count,
    });
  };

  useEffect(() => {
    setIsComplete(criticalIssuesCount.es === 0 && criticalIssuesCount.kibana === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criticalIssuesCount]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <ESDeprecationStats setCriticalIssuesCount={setCriticalIssuesCountFor.bind(null, 'es')} />
      </EuiFlexItem>

      <EuiFlexItem>
        <KibanaDeprecationStats
          setCriticalIssuesCount={setCriticalIssuesCountFor.bind(null, 'kibana')}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getFixIssuesStep = ({ nextMajor, isComplete, setIsComplete }: Props): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  return {
    title: i18nTexts.reviewStepTitle,
    status,
    'data-test-subj': `fixIssuesStep-${status}`,
    children: (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.fixIssuesStepDescription"
              defaultMessage="Update your Elasticsearch and Kibana deployments to be compatible with {nextMajor}.0. Critical issues must be resolved before you upgrade."
              values={{ nextMajor }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <FixIssuesStep isComplete={isComplete} setIsComplete={setIsComplete} />
      </>
    ),
  };
};

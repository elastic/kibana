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

import type { OverviewStepProps } from '../../types';
import { EsDeprecationIssuesPanel, KibanaDeprecationIssuesPanel } from './components';

const i18nTexts = {
  reviewStepTitle: i18n.translate('xpack.upgradeAssistant.overview.fixIssuesStepTitle', {
    defaultMessage: 'Review deprecated settings and resolve issues',
  }),
};

interface Props {
  setIsComplete: OverviewStepProps['setIsComplete'];
}

interface StepProps extends OverviewStepProps {
  nextMajor: number;
}

const FixIssuesStep: FunctionComponent<Props> = ({ setIsComplete }) => {
  // We consider ES and Kibana issues to be fixed when there are 0 critical issues.
  const [isEsFixed, setIsEsFixed] = useState(false);
  const [isKibanaFixed, setIsKibanaFixed] = useState(false);

  useEffect(() => {
    setIsComplete(isEsFixed && isKibanaFixed);
    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEsFixed, isKibanaFixed]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EsDeprecationIssuesPanel setIsFixed={setIsEsFixed} />
      </EuiFlexItem>

      <EuiFlexItem>
        <KibanaDeprecationIssuesPanel setIsFixed={setIsKibanaFixed} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getFixIssuesStep = ({
  nextMajor,
  isComplete,
  setIsComplete,
}: StepProps): EuiStepProps => {
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

        <FixIssuesStep setIsComplete={setIsComplete} />
      </>
    ),
  };
};

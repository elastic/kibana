/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';

import { EuiText, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import type { OverviewStepProps } from '../../types';
import { ClusterDeprecationIssuesPanel } from './components';

const i18nTexts = {
  upgradeReadinessStepTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.upgradeReadinessStepTitle',
    {
      defaultMessage: 'Resolve unhealthy cluster issues',
    }
  ),
};

interface Props {
  setIsComplete: OverviewStepProps['setIsComplete'];
}

const UpgradeReadinessStep: FunctionComponent<Props> = ({ setIsComplete }) => {
  // We consider ES and Kibana issues to be fixed when there are 0 critical issues.
  const [isClusterFixed, setIsClusterFixed] = useState(false);

  useEffect(() => {
    setIsComplete(isClusterFixed);
    // Depending upon setIsComplete would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClusterFixed]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <ClusterDeprecationIssuesPanel setIsFixed={setIsClusterFixed} />
      </EuiFlexItem>
      <EuiFlexItem grow={1} />
    </EuiFlexGroup>
  );
};

export const getUpgradeReadinessStep = ({
  isComplete,
  setIsComplete,
}: OverviewStepProps): EuiStepProps => {
  const status = isComplete ? 'complete' : 'incomplete';

  return {
    title: i18nTexts.upgradeReadinessStepTitle,
    status,
    'data-test-subj': `upgradeReadinessStep-${status}`,
    children: (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.overview.upgradeReadinessStepDescription"
              defaultMessage="Update your Elasticsearch and Kibana deployments to be compatible with the next version of the Elastic Stack. Critical issues must be resolved before you upgrade."
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <UpgradeReadinessStep setIsComplete={setIsComplete} />
      </>
    ),
  };
};

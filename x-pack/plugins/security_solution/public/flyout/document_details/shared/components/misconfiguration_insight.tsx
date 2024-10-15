/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, type EuiFlexGroupProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { InsightDistributionBar } from './insight_distribution_bar';
import { getFindingsStats } from '../../../../cloud_security_posture/components/misconfiguration/misconfiguration_preview';

interface MisconfigurationsInsightProps {
  /**
   *  Entity name to retrieve misconfigurations for
   */
  name: string;
  /**
   * Indicator whether the entity is host or user
   */
  fieldName: 'host.name' | 'user.name';
  /**
   * The direction of the flex group
   */
  direction?: EuiFlexGroupProps['direction'];
  /**
   * The data-test-subj to use for the component
   */
  ['data-test-subj']?: string;
}

/*
 * Displays a distribution bar with the count of failed misconfigurations for a given entity
 */
export const MisconfigurationsInsight: React.FC<MisconfigurationsInsightProps> = ({
  name,
  fieldName,
  direction,
  'data-test-subj': dataTestSubj,
}) => {
  const { data } = useMisconfigurationPreview({
    query: buildEntityFlyoutPreviewQuery(fieldName, name),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;
  const hasMisconfigurationFindings = passedFindings > 0 || failedFindings > 0;

  const misconfigurationsStats = useMemo(
    () => getFindingsStats(passedFindings, failedFindings),
    [passedFindings, failedFindings]
  );

  if (!hasMisconfigurationFindings) return null;

  return (
    <EuiFlexItem data-test-subj={dataTestSubj}>
      <InsightDistributionBar
        title={
          <FormattedMessage
            id="xpack.securitySolution.insights.misconfigurationsTitle"
            defaultMessage="Misconfigurations:"
          />
        }
        stats={misconfigurationsStats}
        count={failedFindings}
        direction={direction}
        data-test-subj={`${dataTestSubj}-distribution-bar`}
      />
    </EuiFlexItem>
  );
};

MisconfigurationsInsight.displayName = 'MisconfigurationsInsight';

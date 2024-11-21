/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexItem, type EuiFlexGroupProps, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import {
  MISCONFIGURATION_INSIGHT,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { InsightDistributionBar } from './insight_distribution_bar';
import { getFindingsStats } from '../../../../cloud_security_posture/components/misconfiguration/misconfiguration_preview';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { PreviewLink } from '../../../shared/components/preview_link';
import { useDocumentDetailsContext } from '../context';

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
  /**
   * used to track the instance of this component, prefer kebab-case
   */
  telemetrySuffix?: string;
}

/*
 * Displays a distribution bar with the count of total misconfigurations for a given entity
 */
export const MisconfigurationsInsight: React.FC<MisconfigurationsInsightProps> = ({
  name,
  fieldName,
  direction,
  'data-test-subj': dataTestSubj,
  telemetrySuffix,
}) => {
  const { scopeId, isPreview } = useDocumentDetailsContext();
  const { euiTheme } = useEuiTheme();
  const { data } = useMisconfigurationPreview({
    query: buildEntityFlyoutPreviewQuery(fieldName, name),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  useEffect(() => {
    uiMetricService.trackUiMetric(
      METRIC_TYPE.COUNT,
      `${MISCONFIGURATION_INSIGHT}-${telemetrySuffix}`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;
  const totalFindings = useMemo(
    () => passedFindings + failedFindings,
    [passedFindings, failedFindings]
  );
  const hasMisconfigurationFindings = totalFindings > 0;

  const misconfigurationsStats = useMemo(
    () => getFindingsStats(passedFindings, failedFindings),
    [passedFindings, failedFindings]
  );

  const count = useMemo(
    () => (
      <div
        css={css`
          margin-top: ${euiTheme.size.xs};
          margin-bottom: ${euiTheme.size.xs};
        `}
      >
        <PreviewLink
          field={fieldName}
          value={name}
          scopeId={scopeId}
          isPreview={isPreview}
          data-test-subj={`${dataTestSubj}-count`}
        >
          <FormattedCount count={totalFindings} />
        </PreviewLink>
      </div>
    ),
    [totalFindings, fieldName, name, scopeId, isPreview, dataTestSubj, euiTheme.size]
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
        count={count}
        direction={direction}
        data-test-subj={`${dataTestSubj}-distribution-bar`}
      />
    </EuiFlexItem>
  );
};

MisconfigurationsInsight.displayName = 'MisconfigurationsInsight';

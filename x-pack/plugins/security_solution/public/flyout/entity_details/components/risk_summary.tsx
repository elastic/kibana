/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiFontSize,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ONE_WEEK_IN_HOURS } from '../../../timelines/components/side_panel/new_user_detail/constants';
import {
  FormattedRelativePreferenceDate,
  PreferenceFormattedDate,
} from '../../../common/components/formatted_date';
import { RiskScoreEntity } from '../../../../common/risk_engine';
import type { RiskScoreState } from '../../../explore/containers/risk_score';

import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getRiskScoreMetricAttributes } from '../../../common/components/visualization_actions/lens_attributes/common/risk_scores/risk_score_metric';
import { ExpandFlyoutButton } from './expand_flyout_button';
import { useExpandDetailsFlyout } from '../hooks/use_expand_details_flyout';

export interface RiskSummaryProps {
  riskScoreData: RiskScoreState<RiskScoreEntity.user>;
}

interface TableItem {
  category: string;
  count: number;
}

export const RiskSummary = ({ riskScoreData }: RiskSummaryProps) => {
  const { data: userRisk, isAuthorized: isRiskScoreAuthorized } = riskScoreData;
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

  const lensAttributes = useMemo(() => {
    return getRiskScoreMetricAttributes({
      severity: userRiskData?.user?.risk?.calculated_level,
      query: `user.name: ${userRiskData?.user?.name}`,
      spaceId: 'default',
      riskEntity: RiskScoreEntity.user,
    });
  }, [userRiskData]);

  const columns: Array<EuiBasicTableColumn<TableItem>> = useMemo(
    () => [
      {
        field: 'category',
        name: 'Category', // TODO
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
      },
      {
        field: 'count',
        name: 'Inputs', // TODO
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        dataType: 'number',
      },
    ],
    []
  );

  const { isExpanded, onToggle } = useExpandDetailsFlyout();

  const xsFontSize = useEuiFontSize('xxs').fontSize;

  const items: TableItem[] = [
    {
      category: 'Alerts',
      count: userRiskData?.user.risk.inputs?.length ?? 0,
    },
  ];

  if (!isRiskScoreAuthorized || !userRiskData) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup direction="row" alignItems="baseline" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{'Risk summary'}</h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <span
            css={css`
              font-size: ${xsFontSize};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskUpdatedTime"
              defaultMessage="Updated {time}"
              values={{
                time: (
                  <FormattedRelativePreferenceDate
                    value={userRiskData['@timestamp']}
                    dateFormat="MMM D, YYYY"
                    relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                  />
                ),
              }}
            />
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} hasBorder={true}>
        <EuiFlexGroup gutterSize="m" direction="row">
          <EuiFlexItem grow={false}>
            <VisualizationEmbeddable
              applyGlobalQueriesAndFilters={false}
              lensAttributes={lensAttributes}
              id={`RiskSummary-risk_score_metric`}
              timerange={{ from: 'now-30d', to: 'now' }}
              width={110}
              height={110}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBasicTable
              columns={columns}
              items={items}
              loading={!userRiskData}
              compressed
              // noItemsMessage={<EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <ExpandFlyoutButton
              isExpanded={isExpanded}
              onToggle={onToggle}
              collapsedText={i18n.translate(
                'xpack.securitySolution.flyout.right.entityDetails.showAllRiskInputs',
                {
                  defaultMessage: 'Show all risk inputs',
                }
              )}
              expandedText={i18n.translate(
                'xpack.securitySolution.flyout.right.header.hideAllRiskInputs',
                {
                  defaultMessage: 'Hide all risk inputs',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import {
  useEuiTheme,
  EuiAccordion,
  EuiTitle,
  EuiSpacer,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana/kibana_react';

import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';

import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { ONE_WEEK_IN_HOURS } from '../../../timelines/components/side_panel/new_user_detail/constants';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import type { RiskScoreState } from '../../api/hooks/use_risk_score';
import { getRiskScoreSummaryAttributes } from '../../lens_attributes/risk_score_summary';

import {
  buildColumns,
  getEntityData,
  getItems,
  isUserRiskData,
  LAST_30_DAYS,
  LENS_VISUALIZATION_HEIGHT,
  LENS_VISUALIZATION_MIN_WIDTH,
  SUMMARY_TABLE_MIN_WIDTH,
} from './common';

export interface RiskSummaryProps<T extends RiskScoreEntity> {
  riskScoreData: RiskScoreState<T>;
  queryId: string;
  openDetailsPanel: (tab: EntityDetailsLeftPanelTab) => void;
}

const RiskSummaryComponent = <T extends RiskScoreEntity>({
  riskScoreData,
  queryId,
  openDetailsPanel,
}: RiskSummaryProps<T>) => {
  const { telemetry } = useKibana().services;
  const { data } = riskScoreData;
  const riskData = data && data.length > 0 ? data[0] : undefined;
  const entityData = getEntityData(riskData);
  const { euiTheme } = useEuiTheme();

  const lensAttributes = useMemo(() => {
    const entityName = entityData?.name ?? '';
    const fieldName = isUserRiskData(riskData) ? 'user.name' : 'host.name';

    return getRiskScoreSummaryAttributes({
      severity: entityData?.risk?.calculated_level,
      query: `${fieldName}: ${entityName}`,
      spaceId: 'default',
      riskEntity: isUserRiskData(riskData) ? RiskScoreEntity.user : RiskScoreEntity.host,
    });
  }, [entityData?.name, entityData?.risk?.calculated_level, riskData]);

  const xsFontSize = useEuiFontSize('xxs').fontSize;

  const [isAssetCriticalityEnabled] = useUiSetting$<boolean>(ENABLE_ASSET_CRITICALITY_SETTING);

  const columns = useMemo(
    () => buildColumns(isAssetCriticalityEnabled),
    [isAssetCriticalityEnabled]
  );

  const rows = useMemo(
    () => getItems(entityData, isAssetCriticalityEnabled),
    [entityData, isAssetCriticalityEnabled]
  );

  const onToggle = useCallback(
    (isOpen) => {
      const entity = isUserRiskData(riskData) ? 'user' : 'host';

      telemetry.reportToggleRiskSummaryClicked({
        entity,
        action: isOpen ? 'show' : 'hide',
      });
    },
    [riskData, telemetry]
  );

  const casesAttachmentMetadata = useMemo(
    () => ({
      description: i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.riskSummary.casesAttachmentLabel',
        {
          defaultMessage:
            'Risk score for {entityType, select, host {host} user {user}} {entityName}',
          values: {
            entityName: entityData?.name,
            entityType: isUserRiskData(riskData) ? 'user' : 'host',
          },
        }
      ),
    }),
    [entityData?.name, riskData]
  );

  const timerange = useMemo(() => {
    const from = dateMath.parse(LAST_30_DAYS.from)?.toISOString() ?? LAST_30_DAYS.from;
    const to = dateMath.parse(LAST_30_DAYS.to)?.toISOString() ?? LAST_30_DAYS.to;
    return { from, to };
  }, []);

  return (
    <EuiAccordion
      onToggle={onToggle}
      initialIsOpen
      id={'risk_summary'}
      buttonProps={{
        css: css`
          color: ${euiTheme.colors.primary};
        `,
      }}
      buttonContent={
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.title"
              defaultMessage="{entity} risk summary"
              values={{ entity: isUserRiskData(riskData) ? 'User' : 'Host' }}
            />
          </h3>
        </EuiTitle>
      }
      extraAction={
        <span
          data-test-subj="risk-summary-updatedAt"
          css={css`
            font-size: ${xsFontSize};
          `}
        >
          {riskData && (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskUpdatedTime"
              defaultMessage="Updated {time}"
              values={{
                time: (
                  <FormattedRelativePreferenceDate
                    value={riskData['@timestamp']}
                    dateFormat="MMM D, YYYY"
                    relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                  />
                ),
              }}
            />
          )}
        </span>
      }
    >
      <EuiSpacer size="m" />

      <ExpandablePanel
        data-test-subj="riskInputs"
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskInputs"
              defaultMessage="View risk contributions"
            />
          ),
          link: {
            callback: () => openDetailsPanel(EntityDetailsLeftPanelTab.RISK_INPUTS),
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.showAllRiskInputs"
                defaultMessage="Show all risk inputs"
              />
            ),
          },
          iconType: 'arrowStart',
        }}
        expand={{
          expandable: false,
        }}
      >
        <EuiFlexGroup gutterSize="m" direction="row" wrap>
          <EuiFlexItem grow={1}>
            <div
              // Improve Visualization loading state by predefining the size
              // Set min-width for a fluid layout
              css={css`
                height: ${LENS_VISUALIZATION_HEIGHT}px;
                min-width: ${LENS_VISUALIZATION_MIN_WIDTH}px;
              `}
            >
              {riskData && (
                <VisualizationEmbeddable
                  applyGlobalQueriesAndFilters={false}
                  applyPageAndTabsFilters={false}
                  lensAttributes={lensAttributes}
                  id={`RiskSummary-risk_score_metric`}
                  timerange={timerange}
                  width={'100%'}
                  height={LENS_VISUALIZATION_HEIGHT}
                  disableOnClickFilter
                  inspectTitle={
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.inspectVisualizationTitle"
                      defaultMessage="Risk Summary Visualization"
                    />
                  }
                  casesAttachmentMetadata={casesAttachmentMetadata}
                />
              )}
            </div>
          </EuiFlexItem>
          <EuiFlexItem
            grow={3}
            css={css`
              min-width: ${SUMMARY_TABLE_MIN_WIDTH}px;
            `}
          >
            <InspectButtonContainer>
              <div
                // Anchors the position absolute inspect button (nearest positioned ancestor)
                css={css`
                  position: relative;
                `}
              >
                <div
                  // Position the inspect button above the table
                  css={css`
                    position: absolute;
                    right: 0;
                    top: -${euiThemeVars.euiSize};
                  `}
                >
                  <InspectButton
                    queryId={queryId}
                    title={
                      <FormattedMessage
                        id="xpack.securitySolution.flyout.entityDetails.inspectTableTitle"
                        defaultMessage="Risk Summary Table"
                      />
                    }
                  />
                </div>
                <EuiBasicTable
                  data-test-subj="risk-summary-table"
                  responsive={false}
                  columns={columns}
                  items={rows}
                  compressed
                />
              </div>
            </InspectButtonContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ExpandablePanel>
      <EuiSpacer size="s" />
    </EuiAccordion>
  );
};

export const RiskSummary = React.memo(RiskSummaryComponent);
RiskSummary.displayName = 'RiskSummary';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { useTransformCapabilities } from '../../../../hooks';
import { needsReauthorization } from '../../../../common/reauthorization_utils';
import type { TransformId } from '../../../../../../common/types/transform';
import { isLatestTransform, isPivotTransform } from '../../../../../../common/types/transform';
import { TRANSFORM_STATE } from '../../../../../../common/constants';

import type { TransformListRow } from '../../../../common';
import { getTransformProgress, TRANSFORM_LIST_COLUMN } from '../../../../common';
import { useActions } from './use_actions';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';

import { TransformHealthColoredDot } from './transform_health_colored_dot';
import { TransformTaskStateBadge } from './transform_task_state_badge';

const TRUNCATE_TEXT_LINES = 3;

const TRANSFORM_INSUFFICIENT_PERMISSIONS_MSG = i18n.translate(
  'xpack.transform.transformList.needsReauthorizationBadge.insufficientPermissions',
  {
    defaultMessage: 'This transform was created with insufficient permissions.',
  }
);

const StatsUnknown = () => (
  <EuiText textAlign="center" color="subdued" size="s">
    <FormattedMessage id="xpack.transform.transformList.statsUnknown" defaultMessage="Unknown" />
  </EuiText>
);
export const useColumns = (
  expandedRowItemIds: TransformId[],
  setExpandedRowItemIds: React.Dispatch<React.SetStateAction<TransformId[]>>,
  transformNodes: number,
  transformSelection: TransformListRow[],
  transformsStatsLoading: boolean
) => {
  const NoStatsFallbackComponent = transformsStatsLoading ? EuiLoadingSpinner : StatsUnknown;
  const { canStartStopTransform } = useTransformCapabilities();

  const { actions, modals } = useActions({
    forceDisable: transformSelection.length > 0,
    transformNodes,
  });

  function toggleDetails(item: TransformListRow) {
    const index = expandedRowItemIds.indexOf(item.config.id);
    if (index !== -1) {
      expandedRowItemIds.splice(index, 1);
      setExpandedRowItemIds([...expandedRowItemIds]);
    } else {
      expandedRowItemIds.push(item.config.id);
    }

    // spread to a new array otherwise the component wouldn't re-render
    setExpandedRowItemIds([...expandedRowItemIds]);
  }

  const columns: [
    EuiTableComputedColumnType<TransformListRow>,
    EuiTableFieldDataColumnType<TransformListRow>,
    EuiTableComputedColumnType<TransformListRow>,
    EuiTableFieldDataColumnType<TransformListRow>,
    EuiTableComputedColumnType<TransformListRow>,
    EuiTableComputedColumnType<TransformListRow>,
    EuiTableComputedColumnType<TransformListRow>,
    EuiTableComputedColumnType<TransformListRow>,
    EuiTableComputedColumnType<TransformListRow>,
    EuiTableActionsColumnType<TransformListRow>
  ] = [
    {
      name: (
        <EuiScreenReaderOnly>
          <p>
            <FormattedMessage
              id="xpack.transform.transformList.showDetailsColumn.screenReaderDescription"
              defaultMessage="This column contains clickable controls for showing more details on each transform"
            />
          </p>
        </EuiScreenReaderOnly>
      ),
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: TransformListRow) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={
            expandedRowItemIds.includes(item.config.id)
              ? i18n.translate('xpack.transform.transformList.rowCollapse', {
                  defaultMessage: 'Hide details for {transformId}',
                  values: { transformId: item.config.id },
                })
              : i18n.translate('xpack.transform.transformList.rowExpand', {
                  defaultMessage: 'Show details for {transformId}',
                  values: { transformId: item.config.id },
                })
          }
          iconType={expandedRowItemIds.includes(item.config.id) ? 'arrowDown' : 'arrowRight'}
          data-test-subj="transformListRowDetailsToggle"
        />
      ),
    },
    {
      field: TRANSFORM_LIST_COLUMN.ID,
      'data-test-subj': 'transformListColumnId',
      name: 'ID',
      sortable: true,
      truncateText: { lines: TRUNCATE_TEXT_LINES },
      scope: 'row',
      render: (transformId, item) => {
        if (!isManagedTransform(item)) return <span title={transformId}>{transformId}</span>;
        return (
          <>
            <span
              title={`${transformId} (${i18n.translate(
                'xpack.transform.transformList.managedBadgeLabel',
                {
                  defaultMessage: 'Managed',
                }
              )})`}
            >
              {transformId}
            </span>
            &nbsp;
            <EuiToolTip
              content={i18n.translate('xpack.transform.transformList.managedBadgeTooltip', {
                defaultMessage:
                  'This transform is preconfigured and managed by Elastic; other parts of the product might have might have dependencies on its behavior.',
              })}
            >
              <EuiBadge color="hollow" data-test-subj="transformListRowIsManagedBadge">
                {i18n.translate('xpack.transform.transformList.managedBadgeLabel', {
                  defaultMessage: 'Managed',
                })}
              </EuiBadge>
            </EuiToolTip>
          </>
        );
      },
    },
    {
      id: 'alertRule',
      name: (
        <EuiScreenReaderOnly>
          <p>
            <FormattedMessage
              id="xpack.transform.transformList.alertingRules.screenReaderDescription"
              defaultMessage="This column displays an icon when there are alert rules associated with a transform"
            />
          </p>
        </EuiScreenReaderOnly>
      ),
      width: '30px',
      render: (item) => {
        const needsReauth = needsReauthorization(item);

        const actionMsg = canStartStopTransform
          ? i18n.translate(
              'xpack.transform.transformList.needsReauthorizationBadge.reauthorizeTooltip',
              {
                defaultMessage: 'Reauthorize to start transforms.',
              }
            )
          : i18n.translate(
              'xpack.transform.transformList.needsReauthorizationBadge.contactAdminTooltip',
              {
                defaultMessage: 'Contact your administrator to request the required permissions.',
              }
            );
        const needsReauthTooltipIcon = needsReauth ? (
          <>
            <EuiToolTip content={`${TRANSFORM_INSUFFICIENT_PERMISSIONS_MSG} ${actionMsg}`}>
              <EuiIcon size="s" color="warning" type={'alert'} />
            </EuiToolTip>
            &nbsp;
          </>
        ) : null;

        const alertingRulesTooltipIcon = Array.isArray(item.alerting_rules) ? (
          <EuiToolTip
            position="bottom"
            content={
              <FormattedMessage
                id="xpack.transform.transformList.alertingRules.tooltipContent"
                defaultMessage="Transform has {rulesCount} associated alert {rulesCount, plural, one { rule} other { rules}}"
                values={{ rulesCount: item.alerting_rules.length }}
              />
            }
          >
            <EuiIcon type="bell" />
          </EuiToolTip>
        ) : (
          <span />
        );
        return (
          <>
            {needsReauthTooltipIcon}
            {alertingRulesTooltipIcon}
          </>
        );
      },
    },
    {
      field: TRANSFORM_LIST_COLUMN.DESCRIPTION,
      'data-test-subj': 'transformListColumnDescription',
      name: i18n.translate('xpack.transform.description', { defaultMessage: 'Description' }),
      sortable: true,
      truncateText: { lines: TRUNCATE_TEXT_LINES },
      render(text: string) {
        return <span title={text}>{text}</span>;
      },
    },
    {
      name: i18n.translate('xpack.transform.type', { defaultMessage: 'Type' }),
      'data-test-subj': 'transformListColumnType',
      sortable: (item: TransformListRow) => item.mode,
      truncateText: true,
      render(item: TransformListRow) {
        let transformType = i18n.translate('xpack.transform.type.unknown', {
          defaultMessage: 'unknown',
        });
        if (isPivotTransform(item.config) === true) {
          transformType = i18n.translate('xpack.transform.type.pivot', { defaultMessage: 'pivot' });
        }
        if (isLatestTransform(item.config) === true) {
          transformType = i18n.translate('xpack.transform.type.latest', {
            defaultMessage: 'latest',
          });
        }
        return <EuiBadge color="hollow">{transformType}</EuiBadge>;
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.status', { defaultMessage: 'Status' }),
      'data-test-subj': 'transformListColumnStatus',
      sortable: (item: TransformListRow) => item.stats?.state,
      truncateText: true,
      render(item: TransformListRow) {
        return item.stats ? (
          <TransformTaskStateBadge state={item.stats.state} reason={item.stats.reason} />
        ) : (
          <NoStatsFallbackComponent />
        );
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.mode', { defaultMessage: 'Mode' }),
      'data-test-subj': 'transformListColumnMode',
      sortable: (item: TransformListRow) => item.mode,
      truncateText: true,
      render(item: TransformListRow) {
        const mode = item.mode;
        const color = 'hollow';
        return <EuiBadge color={color}>{mode}</EuiBadge>;
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.progress', { defaultMessage: 'Progress' }),
      'data-test-subj': 'transformListColumnProgress',
      sortable: (item: TransformListRow) => getTransformProgress(item) || 0,
      truncateText: true,
      render(item: TransformListRow) {
        const progress = getTransformProgress(item);

        const isBatchTransform = typeof item.config.sync === 'undefined';

        if (progress === undefined && isBatchTransform === true) {
          return null;
        }
        if (!item.stats) return <NoStatsFallbackComponent />;

        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {isBatchTransform && (
              <>
                <EuiFlexItem style={{ width: '40px' }} grow={false}>
                  <EuiProgress
                    value={progress}
                    max={100}
                    color="primary"
                    size="m"
                    data-test-subj="transformListProgress"
                  >
                    {progress}%
                  </EuiProgress>
                </EuiFlexItem>
                <EuiFlexItem style={{ width: '35px' }} grow={false}>
                  <EuiText size="xs">{`${progress}%`}</EuiText>
                </EuiFlexItem>
              </>
            )}
            {!isBatchTransform && item.stats && (
              <>
                <EuiFlexItem style={{ width: '40px' }} grow={false}>
                  {/* If not stopped, failed or waiting show the animated progress bar */}
                  {item.stats.state !== TRANSFORM_STATE.STOPPED &&
                    item.stats.state !== TRANSFORM_STATE.WAITING &&
                    item.stats.state !== TRANSFORM_STATE.FAILED && (
                      <EuiProgress color="primary" size="m" />
                    )}
                  {/* If stopped, failed or waiting show an empty (0%) progress bar */}
                  {(item.stats.state === TRANSFORM_STATE.STOPPED ||
                    item.stats.state === TRANSFORM_STATE.WAITING ||
                    item.stats.state === TRANSFORM_STATE.FAILED) && (
                    <EuiProgress value={0} max={100} color="primary" size="m" />
                  )}
                </EuiFlexItem>
                <EuiFlexItem style={{ width: '35px' }} grow={false}>
                  &nbsp;
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        );
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.health', { defaultMessage: 'Health' }),
      'data-test-subj': 'transformListColumnHealth',
      sortable: (item: TransformListRow) => item.stats?.health?.status,
      truncateText: true,
      render(item: TransformListRow) {
        return item.stats && item.stats.health ? (
          <TransformHealthColoredDot healthStatus={item.stats.health.status} />
        ) : (
          <NoStatsFallbackComponent />
        );
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.tableActionLabel', { defaultMessage: 'Actions' }),
      actions: actions as EuiTableActionsColumnType<TransformListRow>['actions'],
      width: '80px',
    },
  ];

  return { columns, modals };
};

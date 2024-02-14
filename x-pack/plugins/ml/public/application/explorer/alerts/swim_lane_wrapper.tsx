/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiNotificationBadge,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ALERT_DURATION,
  ALERT_RULE_NAME,
  ALERT_START,
  ALERT_STATUS_ACTIVE,
  type AlertStatus,
} from '@kbn/rule-data-utils';
import { pick } from 'lodash';
import React, { type FC, useCallback, useMemo, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { PanelHeaderItems } from '../../components/collapsible_panel';
import type { AnomalyDetectionAlert } from './anomaly_detection_alerts_state_service';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_TIMESTAMP,
  alertFieldNameMap,
} from '../../../../common/constants/alerts';
import {
  getAlertEntryFormatter,
  getAlertFormatters,
} from '../../../alerting/anomaly_detection_alerts_table/render_cell_value';
import { useMlKibana } from '../../contexts/kibana';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import type { AppStateSelectedCells, SwimlaneData } from '../explorer_utils';
import { Y_AXIS_LABEL_WIDTH } from '../swimlane_annotation_container';
import { CELL_HEIGHT } from '../swimlane_container';
import { statusNameMap } from './const';

export interface SwimLaneWrapperProps {
  selection?: AppStateSelectedCells | null;
  swimlaneContainerWidth?: number;
  swimLaneData: SwimlaneData;
}

/**
 * Wrapper component for the swim lane
 * that handles the popover for the selected cells.
 */
export const SwimLaneWrapper: FC<SwimLaneWrapperProps> = ({
  children,
  selection,
  swimlaneContainerWidth,
  swimLaneData,
}) => {
  const {
    services: { fieldFormats },
  } = useMlKibana();

  const containerRef = useRef<HTMLDivElement>(null);

  const { anomalyDetectionAlertsStateService, anomalyTimelineStateService } =
    useAnomalyExplorerContext();

  const selectedAlerts = useObservable(anomalyDetectionAlertsStateService.selectedAlerts$, []);

  const leftOffset = useMemo<number>(() => {
    if (!selection || !swimLaneData) return 0;
    const selectedCellIndex = swimLaneData.points.findIndex((v) => v.time === selection.times[0]);
    const cellWidth = swimlaneContainerWidth! / swimLaneData.points.length;

    const cellOffset = (selectedCellIndex + 1) * cellWidth;

    return Y_AXIS_LABEL_WIDTH + cellOffset;
  }, [selection, swimlaneContainerWidth, swimLaneData]);

  const popoverOpen = !!selection && !!selectedAlerts?.length;

  const alertFormatter = useMemo(() => getAlertEntryFormatter(fieldFormats), [fieldFormats]);

  const viewType = 'table';

  const closePopover = useCallback(() => {
    anomalyTimelineStateService.setSelectedCells();
  }, [anomalyTimelineStateService]);

  return (
    <div
      ref={containerRef}
      data-test-subj="mlSwimLaneWrapper"
      css={css`
        position: relative;
      `}
    >
      <div
        data-test-subj="swimLanePopoverTriggerWrapper"
        style={{ left: `${leftOffset}px` }}
        css={css`
          position: absolute;
          top: -${CELL_HEIGHT / 2}px;
          height: 0;
        `}
      >
        <EuiPopover
          button={
            <button
              data-test-subj="mlSwimLanePopoverTrigger"
              css={css`
                position: absolute;
                top: 0;
                visibility: hidden;
              `}
            />
          }
          isOpen={popoverOpen}
          anchorPosition="upCenter"
          hasArrow
          repositionOnScroll
          closePopover={closePopover}
          panelPaddingSize="s"
        >
          <EuiPopoverTitle paddingSize={'xs'}>
            <EuiFlexGroup gutterSize={'none'} justifyContent={'spaceBetween'} alignItems={'center'}>
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  id="xpack.ml.explorer.alertsPanel.header"
                  defaultMessage="Alerts"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize={'none'} alignItems={'center'}>
                  <EuiFlexItem>
                    <PanelHeaderItems
                      compressed
                      headerItems={Object.entries(
                        anomalyDetectionAlertsStateService.countAlertsByStatus(
                          selectedAlerts ?? []
                        ) ?? {}
                      ).map(([status, count]) => {
                        return (
                          <EuiText size={'xs'}>
                            {statusNameMap[status as AlertStatus]}{' '}
                            <EuiNotificationBadge
                              size="s"
                              color={status === ALERT_STATUS_ACTIVE ? 'accent' : 'subdued'}
                            >
                              {count}
                            </EuiNotificationBadge>
                          </EuiText>
                        );
                      })}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      size="s"
                      color={'text'}
                      iconType={'cross'}
                      onClick={closePopover}
                      aria-label={i18n.translate(
                        'xpack.ml.explorer.cellSelectionPopover.closeButtonAriaLabel',
                        {
                          defaultMessage: 'Close popover',
                        }
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverTitle>
          {viewType === 'table' && !!selectedAlerts?.length ? (
            <MiniAlertTable data={selectedAlerts} />
          ) : (
            (selectedAlerts ?? []).map((alert) => {
              const fields = Object.entries(
                pick(alert, [
                  ALERT_RULE_NAME,
                  ALERT_ANOMALY_DETECTION_JOB_ID,
                  ALERT_ANOMALY_TIMESTAMP,
                  ALERT_START,
                  ALERT_DURATION,
                ])
              ).map(([prop, value]) => {
                return alertFormatter(prop, value);
              });

              return (
                <EuiFlexGroup>
                  {fields.map(({ title, description }) => {
                    return (
                      <EuiFlexItem>
                        <EuiDescriptionList compressed listItems={[{ title, description }]} />
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
              );
            })
          )}
        </EuiPopover>
      </div>

      {children}
    </div>
  );
};

export interface MiniAlertTableProps {
  data: AnomalyDetectionAlert[];
}

const ALERT_PER_PAGE = 3;

export const MiniAlertTable: FC<MiniAlertTableProps> = ({ data }) => {
  const {
    services: { fieldFormats },
  } = useMlKibana();

  const alertValueFormatter = useMemo(() => getAlertFormatters(fieldFormats), [fieldFormats]);

  const columns = useMemo<Array<EuiBasicTableColumn<AnomalyDetectionAlert>>>(() => {
    return [
      {
        field: ALERT_RULE_NAME,
        width: `150px`,
        name: alertFieldNameMap[ALERT_RULE_NAME],
        sortable: true,
      },
      {
        field: ALERT_START,
        width: `200px`,
        name: alertFieldNameMap[ALERT_START],
        sortable: true,
        render: (value: number) => alertValueFormatter(ALERT_START, value),
      },
      {
        field: ALERT_DURATION,
        width: `110px`,
        name: alertFieldNameMap[ALERT_DURATION],
        sortable: true,
        render: (value: number) => alertValueFormatter(ALERT_DURATION, value),
      },
    ];
  }, [alertValueFormatter]);

  return (
    <EuiInMemoryTable
      css={{ width: '510px' }}
      compressed
      columns={columns}
      items={data}
      sorting={{
        sort: {
          field: ALERT_START,
          direction: 'asc',
        },
      }}
      pagination={
        data.length > ALERT_PER_PAGE
          ? {
              compressed: true,
              initialPageSize: ALERT_PER_PAGE,
              pageSizeOptions: [3, 5, 10],
            }
          : false
      }
    />
  );
};

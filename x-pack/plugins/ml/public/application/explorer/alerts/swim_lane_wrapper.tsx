/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ALERT_DURATION, ALERT_RULE_NAME, ALERT_START } from '@kbn/rule-data-utils';
import { pick } from 'lodash';
import React, { useMemo, useRef, type FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_TIMESTAMP,
} from '../../../../common/constants/alerts';
import { getAlertEntryFormatter } from '../../../alerting/anomaly_detection_alerts_table/render_cell_value';
import { useMlKibana } from '../../contexts/kibana';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import type { AppStateSelectedCells, SwimlaneData } from '../explorer_utils';
import { Y_AXIS_LABEL_WIDTH } from '../swimlane_annotation_container';
import { CELL_HEIGHT } from '../swimlane_container';

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

  const button = (
    <button
      data-test-subj="mlSwimLanePopoverTrigger"
      css={css`
        position: absolute;
        top: 0;
        visibility: hidden;
      `}
    />
  );

  const alertFormatter = useMemo(() => getAlertEntryFormatter(fieldFormats), [fieldFormats]);

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
          button={button}
          isOpen={popoverOpen}
          anchorPosition="upCenter"
          hasArrow
          repositionOnScroll
          closePopover={() => {}}
          panelPaddingSize="s"
        >
          <EuiPopoverTitle paddingSize={'none'}>
            <EuiButtonIcon
              size="s"
              color={'text'}
              iconType={'cross'}
              onClick={() => anomalyTimelineStateService.setSelectedCells()}
              aria-label={i18n.translate(
                'xpack.ml.explorer.cellSelectionPopover.closeButtonAriaLabel',
                {
                  defaultMessage: 'Close popover',
                }
              )}
            />
          </EuiPopoverTitle>
          {(selectedAlerts ?? []).map((alert) => {
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
          })}
        </EuiPopover>
      </div>

      {children}
    </div>
  );
};

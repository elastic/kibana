/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { css } from '@emotion/react';
import { useEuiTheme, EuiText } from '@elastic/eui';

import {
  TooltipTable,
  TooltipTableBody,
  TooltipHeader,
  TooltipDivider,
  TooltipTableRow,
  TooltipTableCell,
} from '@elastic/charts';

import { MonitorStatusTimeBin, SUCCESS_VIZ_COLOR, DANGER_VIZ_COLOR } from './monitor_status_data';
import * as labels from './labels';

export const MonitorStatusCellTooltip = ({ timeBin }: { timeBin?: MonitorStatusTimeBin }) => {
  const { euiTheme } = useEuiTheme();

  if (!timeBin) {
    return <>{''}</>;
  }

  const dateStr = moment(timeBin.start).format('LL');
  const timeStartStr = moment(timeBin.start).format('HH:mm');
  const timeEndStr = moment(timeBin.end).format('HH:mm');
  const tooltipTitle = `${dateStr} @ ${timeStartStr} - ${timeEndStr}`;
  const availabilityStr =
    timeBin.ups + timeBin.downs > 0
      ? `${Math.round((timeBin.ups / (timeBin.ups + timeBin.downs)) * 100)}%`
      : '-';

  return (
    <>
      <TooltipHeader>
        <EuiText size="xs" css={css({ border: 0, fontWeight: euiTheme.font.weight.bold })}>
          {tooltipTitle}
        </EuiText>
      </TooltipHeader>
      <TooltipDivider />
      <div css={css({ border: 0, padding: euiTheme.size.xs })}>
        <TooltipTable>
          <TooltipTableBody>
            <TooltipTableRow>
              <TooltipListRow label={labels.AVAILABILITY_LABEL} value={availabilityStr} />
            </TooltipTableRow>
            <TooltipTableRow>
              <TooltipListRow
                label={labels.COMPLETE_LABEL}
                value={`${timeBin.ups}` ?? ''}
                color={SUCCESS_VIZ_COLOR}
              />
            </TooltipTableRow>
            <TooltipTableRow>
              <TooltipListRow
                label={labels.FAILED_LABEL}
                value={`${timeBin.downs}` ?? ''}
                color={DANGER_VIZ_COLOR}
              />
            </TooltipTableRow>
          </TooltipTableBody>
        </TooltipTable>
      </div>
    </>
  );
};

const TooltipListRow = ({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: string;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <TooltipTableCell
        css={css({
          outline: 0,
          border: 0,
          borderLeft: 4,
          borderStyle: 'solid',
          borderColor: color ?? 'transparent',
          padding: euiTheme.size.s,
        })}
      >
        <EuiText size="xs">{label}</EuiText>
      </TooltipTableCell>
      <TooltipTableCell> </TooltipTableCell>
      <TooltipTableCell css={css({ border: 0, padding: euiTheme.size.xs, textAlign: 'right' })}>
        <EuiText size="xs" css={css({ border: 0, fontWeight: euiTheme.font.weight.bold })}>
          {value}
        </EuiText>
      </TooltipTableCell>
    </>
  );
};

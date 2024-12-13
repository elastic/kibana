/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiIcon, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { includes, isFunction } from 'lodash';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

const legendItemStyles = (isDisabled: boolean) => (theme: UseEuiTheme) =>
  css`
  font-size: ${theme.euiTheme.font.scale.xs}
  cursor: pointer;
  color: var(--euiTextColor);
  display: flex;
  flex-direction: row;
  align-items: center;
  ${isDisabled ? 'opacity: 0.5;' : ''}
`;

const legendHorizontalStyles = (theme: UseEuiTheme) => css`
  margin-top: var(--euiSizeXS);
`;

const legendLabelStyles = css`
  overflow: hidden;
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const legendValueStyles = (theme: UseEuiTheme) => css`
  overflow: hidden;
  white-space: nowrap;
  margin-left: var(--euiSizeXS);
`;

interface Row {
  id: string;
  label: string;
  legend?: boolean;
  color?: string;
  tickFormatter?: (arg: number) => number;
}

interface Props {
  series: Row[];
  seriesValues: { [key: string]: number };
  seriesFilter: string[];
  onToggle: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
  legendFormatter?: (value: number) => number;
  tickFormatter?: (value: number) => number;
}

export class HorizontalLegend extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    this.formatter = this.formatter.bind(this);
    this.createSeries = this.createSeries.bind(this);
  }

  displayValue(value: number) {
    return <span css={legendValueStyles}>{value}</span>;
  }

  validValue(value: number) {
    return value !== null && value !== undefined && (typeof value === 'string' || !isNaN(value));
  }

  formatter(value: number, row: Row) {
    if (!this.validValue(value)) {
      return (
        <FormattedMessage
          id="xpack.monitoring.chart.horizontalLegend.notAvailableLabel"
          defaultMessage="N/A"
        />
      );
    }

    if (row?.tickFormatter) {
      return this.displayValue(row.tickFormatter(value));
    }

    const formatter = this.props.legendFormatter || this.props.tickFormatter;

    if (isFunction(formatter)) {
      return this.displayValue(formatter(value));
    }
    return this.displayValue(value);
  }

  createSeries(row: Row, rowIdx: number) {
    if (!row.label || row.legend === false) {
      return <div key={rowIdx} style={{ display: 'none' }} />;
    }

    return (
      <EuiFlexItem grow={false} key={rowIdx}>
        <button
          css={legendItemStyles(!includes(this.props.seriesFilter, row.id))}
          onClick={(event) => this.props.onToggle(event, row.id)}
        >
          <span css={legendLabelStyles}>
            <EuiIcon
              aria-label={i18n.translate(
                'xpack.monitoring.chart.horizontalLegend.toggleButtonAriaLabel',
                { defaultMessage: 'toggle button' }
              )}
              size="l"
              type="dot"
              color={row.color}
            />
            {` ${row.label} `}
          </span>
          {this.formatter(this.props.seriesValues[row.id], row)}
        </button>
      </EuiFlexItem>
    );
  }

  render() {
    const rows = this.props.series.map(this.createSeries);

    return (
      <div css={legendHorizontalStyles}>
        <EuiFlexGroup wrap={true} gutterSize="s">
          {rows}
        </EuiFlexGroup>
      </div>
    );
  }
}

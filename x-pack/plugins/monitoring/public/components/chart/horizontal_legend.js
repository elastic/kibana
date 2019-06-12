/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { includes, isFunction } from 'lodash';
import {
  EuiKeyboardAccessible,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export class HorizontalLegend extends React.Component {
  constructor() {
    super();
    this.formatter = this.formatter.bind(this);
    this.createSeries = this.createSeries.bind(this);
  }

  /**
   * @param {Number} value Final value to display
   */
  displayValue(value) {
    return (
      <span className="monRhythmChart__legendValue">
        { value }
      </span>
    );
  }

  /**
   * @param {Number} value True if value is falsy and/or not a number
   */
  validValue(value) {
    return value !== null && value !== undefined && (typeof value === 'string' || !isNaN(value));
  }

  /**
   * @param {Number} value The value to format and show in the horizontallegend.
   * A null means no data for the time bucket and will be formatted as 'N/A'
   * @param {Object} row Props passed form a parent by row index
   */
  formatter(value, row) {
    if (!this.validValue(value)) {
      return (<FormattedMessage
        id="xpack.monitoring.chart.horizontalLegend.notAvailableLabel"
        defaultMessage="N/A"
      />);
    }

    if (row && row.tickFormatter) {
      return this.displayValue(row.tickFormatter(value));
    }

    if (isFunction(this.props.tickFormatter)) {
      return this.displayValue(this.props.tickFormatter(value));
    }
    return this.displayValue(value);
  }

  createSeries(row, rowIdx) {
    const classes = ['col-md-4 col-xs-6 monRhythmChart__legendItem'];

    if (!includes(this.props.seriesFilter, row.id)) {
      classes.push('monRhythmChart__legendItem-isDisabled');
    }
    if (!row.label || row.legend === false) {
      return (
        <div
          key={rowIdx}
          style={{ display: 'none' }}
        />
      );
    }

    return (
      <EuiKeyboardAccessible key={rowIdx}>
        <div
          className={classes.join(' ')}
          onClick={event => this.props.onToggle(event, row.id)}
        >
          <span className="monRhythmChart__legendLabel">
            <span
              className="fa fa-circle monRhythmChart__legendIndicator"
              style={{ color: row.color }}
              aria-label={i18n.translate('xpack.monitoring.chart.horizontalLegend.toggleButtonAriaLabel', {
                defaultMessage: 'toggle button'
              })}
            />
            { ' ' + row.label + ' ' }
          </span>
          { this.formatter(this.props.seriesValues[row.id], row) }
        </div>
      </EuiKeyboardAccessible>
    );
  }

  render() {
    const rows = this.props.series.map(this.createSeries);

    return (
      <div className="monRhythmChart__legendHorizontal">
        <div className="row monRhythmChart__legend-series">
          { rows }
        </div>
      </div>
    );
  }
}

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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

class HorizontalLegendUI extends React.Component {
  constructor() {
    super();
    this.formatter = this.formatter.bind(this);
    this.createSeries = this.createSeries.bind(this);
  }

  /**
   * @param {Number} value The value to format and show in the horizontal
   * legend. A null means no data for the time bucket and will be formatted as
  * 'N/A'
   */
  formatter(value) {
    if (value === null) {
      return (<FormattedMessage
        id="xpack.monitoring.chart.horizontalLegend.notAvailableLabel"
        defaultMessage="N/A"
      />);
    }
    if (isFunction(this.props.tickFormatter)) {
      return this.props.tickFormatter(value);
    }
    return value;
  }

  createSeries(row, rowIdx) {
    const { intl } = this.props;
    const formatter = row.tickFormatter || this.formatter;
    const value = formatter(this.props.seriesValues[row.id]);
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
              aria-label={intl.formatMessage({
                id: 'xpack.monitoring.chart.horizontalLegend.toggleButtonAriaLabel',
                defaultMessage: 'toggle button'
              })}
            />
            { ' ' + row.label }
          </span>
          <span className="monRhythmChart__legendValue">
            { ' ' + value }
          </span>
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

export const HorizontalLegend = injectI18n(HorizontalLegendUI);

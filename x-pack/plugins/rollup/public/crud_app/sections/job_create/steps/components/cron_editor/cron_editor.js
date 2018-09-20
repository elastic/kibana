/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { padLeft } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiSelect,
  EuiText,
  EuiFormRow,
} from '@elastic/eui';

import {
  getOrdinalValue,
  getDayName,
  getMonthName,
} from '../../../../../services';

import { CronHourly } from './cron_hourly';
import { CronDaily } from './cron_daily';
import { CronWeekly } from './cron_weekly';
import { CronMonthly } from './cron_monthly';
import { CronYearly } from './cron_yearly';

import './cron_editor.less';

function makeSequence(min, max) {
  const values = [];
  for (let i = min; i <= max; i++) {
    values.push(i);
  }
  return values;
}

const MINUTE_OPTIONS = makeSequence(0, 59).map(value => ({
  value: value.toString(),
  text: padLeft(value, 2, '0'),
}));

const HOUR_OPTIONS = makeSequence(0, 23).map(value => ({
  value: value.toString(),
  text: padLeft(value, 2, '0'),
}));

const DAY_OPTIONS = makeSequence(0, 6).map(value => ({
  value: value.toString(),
  text: getDayName(value),
}));

const DATE_OPTIONS = makeSequence(0, 31).map(value => ({
  value: value.toString(),
  text: getOrdinalValue(value + 1),
}));

const MONTH_OPTIONS = makeSequence(0, 11).map(value => ({
  value: value.toString(),
  text: getMonthName(value),
}));

const MINUTE = 'MINUTE';
const HOUR = 'HOUR';
const DAY = 'DAY';
const WEEK = 'WEEK';
const MONTH = 'MONTH';
const YEAR = 'YEAR';

const UNITS = [{
  value: MINUTE,
  text: 'minute',
}, {
  value: HOUR,
  text: 'hour',
}, {
  value: DAY,
  text: 'day',
}, {
  value: WEEK,
  text: 'week',
}, {
  value: MONTH,
  text: 'month',
}, {
  value: YEAR,
  text: 'year',
}];

const unitToFieldsMap = {
  [MINUTE]: {},
  [HOUR]: {
    minute: true,
  },
  [DAY]: {
    hour: true,
    minute: true,
  },
  [WEEK]: {
    day: true,
    hour: true,
    minute: true,
  },
  [MONTH]: {
    date: true,
    hour: true,
    minute: true,
  },
  [YEAR]: {
    month: true,
    date: true,
    hour: true,
    minute: true,
  },
};

export class CronEditor extends Component {
  static propTypes = {
    cronExpression: PropTypes.string,
  }

  constructor(props) {
    super(props);

    this.state = {
      unit: WEEK,
      minute: '0',
      hour: '0',
      day: '0',
      date: '0',
      month: '0',
    };
  }

  onChangeUnit = (e) => {
    this.setState({ unit: e.target.value });
  };

  onChangeFields = (fields) => {
    const { unit } = this.state;
    const editableFields = Object.keys(unitToFieldsMap[unit]);

    const editedFields = editableFields.reduce((newFields, field) => {
      newFields[field] = fields[field] || this.state[field];
      return newFields;
    }, {});

    this.setState(editedFields);
  };

  renderForm() {
    const {
      unit,
      minute,
      hour,
      day,
      date,
      month,
    } = this.state;

    switch (unit) {
      case MINUTE:
        return;

      case HOUR:
        return (
          <CronHourly
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case DAY:
        return (
          <CronDaily
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case WEEK:
        return (
          <CronWeekly
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            day={day}
            dayOptions={DAY_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case MONTH:
        return (
          <CronMonthly
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            date={date}
            dateOptions={DATE_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      case YEAR:
        return (
          <CronYearly
            minute={minute}
            minuteOptions={MINUTE_OPTIONS}
            hour={hour}
            hourOptions={HOUR_OPTIONS}
            date={date}
            dateOptions={DATE_OPTIONS}
            month={month}
            monthOptions={MONTH_OPTIONS}
            onChange={this.onChangeFields}
          />
        );

      default:
        return;
    }
  }

  render() {
    const { unit } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label={(
            <FormattedMessage
              id="xpack.rollupJobs.cronEditor.fieldInterval.label"
              defaultMessage="Interval"
            />
          )}
          fullWidth
        >
          <EuiSelect
            options={UNITS}
            value={unit}
            onChange={this.onChangeUnit}
            fullWidth
            prepend={(
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.rollupJobs.cronEditor.textEvery.label"
                    defaultMessage="Every"
                  />
                </strong>
              </EuiText>
            )}
          />
        </EuiFormRow>

        {this.renderForm()}
      </Fragment>
    );
  }
}

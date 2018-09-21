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
  cronExpressionToParts,
  cronPartsToExpression,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  MONTH,
  YEAR,
} from '../../../../../services';

import { CronHourly } from './cron_hourly';
import { CronDaily } from './cron_daily';
import { CronWeekly } from './cron_weekly';
import { CronMonthly } from './cron_monthly';
import { CronYearly } from './cron_yearly';

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

const DATE_OPTIONS = makeSequence(1, 31).map(value => ({
  value: value.toString(),
  text: getOrdinalValue(value),
}));

const MONTH_OPTIONS = makeSequence(1, 12).map(value => ({
  value: value.toString(),
  text: getMonthName(value - 1),
}));

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

const unitToBaselineFieldsMap = {
  [MINUTE]: {
    minute: '*',
    hour: '*',
    date: '*',
    month: '*',
    day: '*',
  },
  [HOUR]: {
    minute: '0',
    hour: '*',
    date: '*',
    month: '*',
    day: '*',
  },
  [DAY]: {
    minute: '0',
    hour: '0',
    date: '*',
    month: '*',
    day: '*',
  },
  [WEEK]: {
    minute: '0',
    hour: '0',
    date: '*',
    month: '*',
    day: '6',
  },
  [MONTH]: {
    minute: '0',
    hour: '0',
    date: '1',
    month: '*',
    day: '*',
  },
  [YEAR]: {
    minute: '0',
    hour: '0',
    date: '1',
    month: '1',
    day: '*',
  },
};

export class CronEditor extends Component {
  static propTypes = {
    unit: PropTypes.string,
    cronExpression: PropTypes.string,
    onChange: PropTypes.func,
    onChangeUnit: PropTypes.func,
  }

  static getDerivedStateFromProps(props) {
    const { cronExpression } = props;
    return cronExpressionToParts(cronExpression);
  }

  constructor(props) {
    super(props);

    const { cronExpression } = props;

    const parsedCron = cronExpressionToParts(cronExpression);

    this.state = {
      ...parsedCron,
      fieldToInheritableFlagMap: {},
    };
  }

  onChangeUnit = unit => {
    const { onChange, onChangeUnit } = this.props;
    const { fieldToInheritableFlagMap } = this.state;

    // Update fields which aren't editable with acceptable baseline values.
    const editableFields = Object.keys(unitToFieldsMap[unit]);
    const inheritedFields = editableFields.reduce((baselineFields, field) => {
      if (fieldToInheritableFlagMap[field]) {
        baselineFields[field] = this.state[field];
      }
      return baselineFields;
    }, { ...unitToBaselineFieldsMap[unit] });

    const newCronExpression = cronPartsToExpression(inheritedFields);
    onChange(newCronExpression);

    onChangeUnit(unit);
  };

  onChangeFields = (fields, unit = this.props.unit) => {
    const { onChange } = this.props;

    const editableFields = Object.keys(unitToFieldsMap[unit]);
    const newFieldToInheritableFlagMap = {};

    const editedFields = editableFields.reduce((accumFields, field) => {
      if (fields[field] !== undefined) {
        accumFields[field] = fields[field];
        // Once the user edits a field, we want to persist it across units.
        newFieldToInheritableFlagMap[field] = true;
      } else {
        accumFields[field] = this.state[field];
      }
      return accumFields;
    }, {});

    const newCronExpression = cronPartsToExpression(editedFields);
    onChange(newCronExpression);

    this.setState(state => ({
      fieldToInheritableFlagMap: {
        ...state.fieldToInheritableFlagMap,
        ...newFieldToInheritableFlagMap,
      },
    }));
  };

  renderForm() {
    const { unit } = this.props;

    const {
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
    const { unit } = this.props;

    return (
      <Fragment>
        <EuiFormRow
          label={(
            <FormattedMessage
              id="xpack.rollupJobs.cronEditor.fieldFrequency.label"
              defaultMessage="Frequency"
            />
          )}
          fullWidth
        >
          <EuiSelect
            options={UNITS}
            value={unit}
            onChange={e => this.onChangeUnit(e.target.value)}
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

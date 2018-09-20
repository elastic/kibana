/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFlexItem,
  EuiSelect,
  EuiFlexGroup,
} from '@elastic/eui';

export const CronMonthly = ({
  minute,
  minuteOptions,
  hour,
  hourOptions,
  date,
  dateOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFlexItem grow={false}>
      <FormattedMessage
        id="xpack.rollupJobs.cronEditor.cronMonthly.textOnThe.label"
        defaultMessage="on the"
      />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiSelect
        options={dateOptions}
        value={date}
        onChange={e => onChange({ date: e.target.value })}
        fullWidth
      />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <FormattedMessage
        id="xpack.rollupJobs.cronEditor.cronMonthly.textAt.label"
        defaultMessage="at"
      />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={hourOptions}
            value={hour}
            onChange={e => onChange({ hour: e.target.value })}
            fullWidth
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          :
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiSelect
            options={minuteOptions}
            value={minute}
            onChange={e => onChange({ minute: e.target.value })}
            fullWidth
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </Fragment>
);

CronMonthly.propTypes = {
  minute: PropTypes.string.isRequired,
  minuteOptions: PropTypes.array.isRequired,
  hour: PropTypes.string.isRequired,
  hourOptions: PropTypes.array.isRequired,
  date: PropTypes.string.isRequired,
  dateOptions: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};

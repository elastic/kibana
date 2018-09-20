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
} from '@elastic/eui';

export const CronHourly = ({
  minute,
  minuteOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFlexItem grow={false}>
      <FormattedMessage
        id="xpack.rollupJobs.cronEditor.cronHourly.textAt.label"
        defaultMessage="at"
      />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiSelect
        options={minuteOptions}
        value={minute}
        onChange={e => onChange({ minute: e.target.value })}
        fullWidth
      />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <FormattedMessage
        id="xpack.rollupJobs.cronEditor.cronHourly.textPastHour.label"
        defaultMessage="minutes past the hour"
      />
    </EuiFlexItem>
  </Fragment>
);

CronHourly.propTypes = {
  minute: PropTypes.string.isRequired,
  minuteOptions: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiText,
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
    <EuiFormRow
      label={(
        <FormattedMessage
          id="xpack.rollupJobs.cronEditor.cronMonthly.fieldDateLabel"
          defaultMessage="Date"
        />
      )}
      fullWidth
    >
      <EuiSelect
        options={dateOptions}
        value={date}
        onChange={e => onChange({ date: e.target.value })}
        fullWidth
        prepend={(
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.rollupJobs.cronEditor.cronMonthly.textOnTheLabel"
                defaultMessage="On the"
              />
            </strong>
          </EuiText>
        )}
      />
    </EuiFormRow>

    <EuiFormRow
      label={(
        <FormattedMessage
          id="xpack.rollupJobs.cronEditor.cronMonthly.fieldTimeLabel"
          defaultMessage="Time"
        />
      )}
      fullWidth
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={hourOptions}
            value={hour}
            onChange={e => onChange({ hour: e.target.value })}
            fullWidth
            prepend={(
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.rollupJobs.cronEditor.cronMonthly.fieldHour.textAtLabel"
                    defaultMessage="At"
                  />
                </strong>
              </EuiText>
            )}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSelect
            options={minuteOptions}
            value={minute}
            onChange={e => onChange({ minute: e.target.value })}
            fullWidth
            prepend={(
              <EuiText size="xs">
                <strong>
                  :
                </strong>
              </EuiText>
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
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

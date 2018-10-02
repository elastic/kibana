/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFormRow,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

export const CronHourly = ({
  minute,
  minuteOptions,
  onChange,
}) => (
  <Fragment>
    <EuiFormRow
      label={(
        <FormattedMessage
          id="xpack.rollupJobs.cronEditor.cronHourly.fieldTimeLabel"
          defaultMessage="Minute"
        />
      )}
      fullWidth
    >
      <EuiSelect
        options={minuteOptions}
        value={minute}
        onChange={e => onChange({ minute: e.target.value })}
        fullWidth
        prepend={(
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.rollupJobs.cronEditor.cronHourly.fieldMinute.textAtLabel"
                defaultMessage="At"
              />
            </strong>
          </EuiText>
        )}
      />
    </EuiFormRow>
  </Fragment>
);

CronHourly.propTypes = {
  minute: PropTypes.string.isRequired,
  minuteOptions: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};

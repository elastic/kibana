/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiDatePicker } from '@elastic/eui';
import React, { forwardRef } from 'react';
import moment from 'moment';

interface Props {
  selectedDate: moment.Moment | null;
  onChangeSelectedDate: (date: moment.Moment | null) => void;
  onClick?: () => void;
  value?: string;
}

export const GoToDate: React.FunctionComponent<Props> = (props) => {
  return (
    <EuiDatePicker
      data-test-subj="agentActivityFlyout.goToDateButton"
      selected={props.selectedDate}
      onChange={props.onChangeSelectedDate}
      maxDate={moment()}
      customInput={<GoToDateButton {...props} />}
    />
  );
};

interface CustomInputProps {
  onClick?: () => void;
  value?: string;
}

const GoToDateButton = forwardRef(({ onClick, value }: CustomInputProps, ref) => {
  return (
    <EuiButtonEmpty size="m" flush="left" onClick={onClick}>
      <FormattedMessage
        id="xpack.fleet.agentActivityFlyout.goToDateButton"
        defaultMessage="Go to date"
      />
    </EuiButtonEmpty>
  );
});

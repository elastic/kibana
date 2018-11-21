/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import moment from 'moment';
import React from 'react';

interface DatePickerInputProps {
  date?: Date;
  onClick?: () => void;
}

export class DatePickerInput extends React.Component<DatePickerInputProps> {
  public render() {
    return (
      <EuiButtonEmpty iconType="calendar" iconSide="left" onClick={this.props.onClick}>
        {moment(this.props.date || new Date()).format('MMM D YYYY HH:mm')}
      </EuiButtonEmpty>
    );
  }
}

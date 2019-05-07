/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText } from '@elastic/eui';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { ChangeEvent, Component } from 'react';

export interface Props {
  /** Input value (Moment date object) */
  moment?: moment.Moment;
  /** Function to invoke when the input changes */
  setMoment: (moment: moment.Moment) => void;
}

export interface State {
  isValid: boolean;
  strValue: string;
}

export class DatetimeInput extends Component<Props, State> {
  public static propTypes = {
    moment: PropTypes.instanceOf(moment),
    setMoment: PropTypes.func,
  };

  constructor(props: Props) {
    super(props);

    const date = moment(props.moment);

    this.state = {
      isValid: props.moment ? date.isValid() : true,
      strValue: props.moment ? date.format('YYYY-MM-DD HH:mm:ss') : '',
    };
  }

  public getDerivedStateFromProps(nextProps: Props): State | null {
    if (this.props.moment && this.props.moment.isSame(nextProps.moment)) {
      return null;
    }

    return {
      strValue: nextProps.moment ? nextProps.moment.format('YYYY-MM-DD HH:mm:ss') : '',
      isValid: true,
    };
  }

  public render() {
    const { setMoment } = this.props;
    const { strValue, isValid } = this.state;
    const check = (e: ChangeEvent<HTMLInputElement>): void => {
      const parsed = moment(e.target.value, 'YYYY-MM-DD HH:mm:ss', true);
      if (parsed.isValid()) {
        setMoment(parsed);
        this.setState({ isValid: true });
      } else {
        this.setState({ isValid: false });
      }
      this.setState({ strValue: e.target.value });
    };

    return (
      <EuiFieldText
        value={strValue}
        onChange={check}
        isInvalid={!isValid}
        style={{ textAlign: 'center' }}
      />
    );
  }
}

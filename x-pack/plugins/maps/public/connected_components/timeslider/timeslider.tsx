/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiFieldNumber,
  EuiButtonIcon,
  EuiPopover,
  EuiTextAlign,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MapCenter } from '../../../../common/descriptor_types';
import { MapSettings } from '../../../reducers/map';

export interface Props {
  isTimesliderOpen: boolean;
  timeRange: TimeRange;
}

interface State {}

// Why Timeslider and KeyedTimeslider?
// Using react 'key' property to ensure new KeyedTimeslider instance whenever props.timeRange changes
export function Timeslider(props: props) {
  return props.isTimesliderOpen ? (
    <KeyedTimeslider key={`${props.timeRange.from}-${props.timeRange.to}`} {...props} />
  ) : null;
}

class KeyedTimeslider extends Component<Props, State> {
  state: State = {};

  render() {
    return <div className="mapTimeslider" />;
  }
}

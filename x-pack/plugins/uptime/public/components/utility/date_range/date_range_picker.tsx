/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';
import moment, { Moment } from 'moment';
import React from 'react';
import { DatePickerInput } from './date_picker_input';
import { options } from './option_definitions';
import { DateSelection } from './types';

interface UMDateRangePickerProps {
  selection: DateSelection;
  updateDateRange: (
    kind: 'relative' | 'absolute',
    relative?: { value: number; unit: string },
    absolute?: { start: Date; end: Date }
  ) => void;
}

interface UMDateRangePickerState {
  showPopover: boolean;
}

export class UMDateRangePicker extends React.Component<
  UMDateRangePickerProps,
  UMDateRangePickerState
> {
  constructor(props: UMDateRangePickerProps) {
    super(props);
    this.state = {
      showPopover: false,
    };
  }

  public render() {
    const {
      updateDateRange,
      selection: { kind, absoluteStart, absoluteEnd, relativeSpanValue, relativeSpanUnit },
    } = this.props;
    // move to constant
    // const formatString = 'YYYY MMM DD HH:mm:SS';
    return (
      <EuiPopover
        id="DateRangeOptions"
        button={
          <EuiButton onClick={this.togglePopover}>
            {kind === 'absolute'
              ? `${moment(absoluteStart).format('MMM-DD-YYYY HH:mm')} - ${moment(
                  absoluteEnd
                ).format('MMM-DD-YYYY HH:mm')}`
              : `${relativeSpanValue}${relativeSpanUnit} - now`}
          </EuiButton>
        }
        isOpen={this.state.showPopover}
        closePopover={this.hidePopover}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h5>Relative</h5>
            </EuiTitle>
            <EuiFlexGroup>
              {options.map(option => (
                <EuiFlexItem key={option.id}>
                  <EuiButtonEmpty
                    onClick={() => {
                      const { unit, value } = option.getRange();
                      updateDateRange('relative', { unit, value });
                    }}
                  >
                    {option.title}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h5>Absolute</h5>
            </EuiTitle>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <EuiFormRow label="Start time">
                  <EuiDatePicker
                    customInput={<DatePickerInput date={absoluteStart} />}
                    // @ts-ignore multiple definitions for type Moment
                    maxDate={moment(absoluteEnd)}
                    onChange={(e: Moment | null) => {
                      if (e !== null) {
                        updateDateRange('absolute', undefined, {
                          start: e.toDate(),
                          end: absoluteEnd,
                        });
                      }
                    }}
                    selected={moment(absoluteStart)}
                    showTimeSelect={true}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label="End time">
                  <EuiDatePicker
                    customInput={<DatePickerInput date={absoluteEnd} />}
                    onChange={(e: Moment | null) => {
                      if (e !== null) {
                        updateDateRange('absolute', undefined, {
                          start: absoluteStart,
                          end: e.toDate(),
                        });
                      }
                    }}
                    selected={moment(absoluteEnd)}
                    showTimeSelect={true}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>
    );
  }

  private togglePopover = () => this.setState({ showPopover: !this.state.showPopover });
  private hidePopover = () => this.setState({ showPopover: false });
}

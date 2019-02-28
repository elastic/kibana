/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiPopoverProps,
} from '@elastic/eui';
import { Moment } from 'moment';
import React from 'react';

import { DateType, RecentlyUsedI } from '../index';

import { CommonlyUsed } from './commonly_used';
import { QuickSelect } from './quick_select';
import { MyRecentlyUsed } from './recently_used';
import { Timer } from './timer';

type MyEuiPopoverProps = Pick<
  EuiPopoverProps,
  'id' | 'closePopover' | 'button' | 'isOpen' | 'anchorPosition'
> & {
  zIndex?: number;
};

const MyEuiPopover: React.SFC<MyEuiPopoverProps> = EuiPopover;

interface Props {
  disabled: boolean;
  recentlyUsed: RecentlyUsedI[];
  isTimerOn: boolean;
  onChange: (from: Moment, to: Moment, type: DateType, msg?: RecentlyUsedI) => void;
  updateAutoReload: (isTimerOn: boolean, interval: number, intervalType: string) => void;
}

interface State {
  quickSelectTime: number;
  quickSelectUnit: string;
  duration: number;
  durationKind: string;
  isPopoverOpen: boolean;
}

export class QuickSelectPopover extends React.PureComponent<Props, State> {
  public readonly state = {
    isPopoverOpen: false,
    quickSelectTime: 1,
    quickSelectUnit: 'hours',
    duration: 5,
    durationKind: 'minutes',
  };

  public render() {
    const { quickSelectTime, quickSelectUnit, duration, durationKind } = this.state;
    const { disabled, isTimerOn, recentlyUsed, updateAutoReload } = this.props;
    const quickSelectButton = (
      <EuiButtonEmpty
        className="euiFormControlLayout__prepend euiGlobalDatePicker__quickSelectButton"
        textProps={{ className: 'euiGlobalDatePicker__quickSelectButtonText' }}
        onClick={this.togglePopover}
        disabled={disabled}
        aria-label="Date quick select"
        size="xs"
        iconType="arrowDown"
        iconSide="right"
      >
        <EuiIcon type="calendar" />
      </EuiButtonEmpty>
    );

    return (
      <MyEuiPopover
        id="QuickSelectPopover"
        button={quickSelectButton}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        anchorPosition="downLeft"
        zIndex={1001}
      >
        <div style={{ width: '400px' }}>
          <QuickSelect
            quickSelectTime={quickSelectTime}
            quickSelectUnit={quickSelectUnit}
            onChange={this.updateState}
            setRangeDatePicker={this.onChange}
          />
          <EuiHorizontalRule margin="s" />
          <CommonlyUsed setRangeDatePicker={this.onChange} />
          <EuiHorizontalRule margin="s" />
          <MyRecentlyUsed recentlyUsed={recentlyUsed} setRangeDatePicker={this.onChange} />
          <EuiHorizontalRule margin="s" />
          <Timer
            duration={duration}
            durationKind={durationKind}
            timerIsOn={isTimerOn}
            onChange={this.updateState}
            toggleTimer={isOn => updateAutoReload(isOn, duration, durationKind)}
          />
        </div>
      </MyEuiPopover>
    );
  }

  private updateState = (
    stateType: string,
    args: React.FormEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>
  ) => {
    let value: string | number = args!.currentTarget.value;

    if ((stateType === 'quickSelectTime' || stateType === 'duration') && value !== '') {
      value = parseInt(args!.currentTarget.value, 10);
    }
    this.setState({
      ...this.state,
      [stateType]: value,
    });
  };

  private onChange = (from: Moment, to: Moment, type: DateType, msg?: RecentlyUsedI) => {
    this.setState(
      {
        ...this.state,
        isPopoverOpen: false,
      },
      () => {
        this.props.onChange(from, to, type, msg);
      }
    );
  };

  private closePopover = () => {
    this.setState({
      ...this.state,
      isPopoverOpen: false,
    });
  };

  private togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };
}

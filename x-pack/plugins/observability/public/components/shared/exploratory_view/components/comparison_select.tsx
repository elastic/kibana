/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';

import { EuiButtonEmpty } from '../../../button';
import { EuiIcon } from '../../../icon';
import { EuiPopover } from '../../../popover';
import { EuiTitle } from '../../../title';
import { EuiSpacer } from '../../../spacer';
import { EuiHorizontalRule } from '../../../horizontal_rule';
import { EuiText } from '../../../text';

import { EuiQuickSelect } from './quick_select';
import { EuiCommonlyUsedTimeRanges } from './commonly_used_time_ranges';
import { EuiRecentlyUsed } from './recently_used';
import { EuiRefreshInterval } from './refresh_interval';
import {
  DurationRange,
  ApplyRefreshInterval,
  ApplyTime,
  QuickSelect,
  QuickSelectPanel,
} from '../../types';

export interface EuiQuickSelectPopoverProps {
  applyRefreshInterval?: ApplyRefreshInterval;
  applyTime: ApplyTime;
  commonlyUsedRanges: DurationRange[];
  customQuickSelectPanels?: QuickSelectPanel[];
  dateFormat: string;
  end: string;
  isAutoRefreshOnly: boolean;
  isDisabled: boolean;
  isPaused: boolean;
  recentlyUsedRanges: DurationRange[];
  refreshInterval: number;
  start: string;
}

interface EuiQuickSelectPopoverState {
  isOpen: boolean;
  prevQuickSelect?: QuickSelect;
}

export class EuiQuickSelectPopover extends Component<
  EuiQuickSelectPopoverProps,
  EuiQuickSelectPopoverState
> {
  state: EuiQuickSelectPopoverState = {
    isOpen: false,
  };

  closePopover = () => {
    this.setState({ isOpen: false });
  };

  togglePopover = () => {
    this.setState((prevState) => ({
      isOpen: !prevState.isOpen,
    }));
  };

  applyTime: ApplyTime = ({ start, end, quickSelect, keepPopoverOpen = false }) => {
    this.props.applyTime({
      start,
      end,
    });
    if (quickSelect) {
      this.setState({ prevQuickSelect: quickSelect });
    }
    if (!keepPopoverOpen) {
      this.closePopover();
    }
  };

  renderDateTimeSections = () => {
    const {
      commonlyUsedRanges,
      dateFormat,
      end,
      isAutoRefreshOnly,
      recentlyUsedRanges,
      start,
    } = this.props;
    const { prevQuickSelect } = this.state;

    if (isAutoRefreshOnly) {
      return null;
    }

    return (
      <Fragment>
        <EuiQuickSelect
          applyTime={this.applyTime}
          start={start}
          end={end}
          prevQuickSelect={prevQuickSelect}
        />
        <EuiCommonlyUsedTimeRanges
          applyTime={this.applyTime}
          commonlyUsedRanges={commonlyUsedRanges}
        />
        <EuiRecentlyUsed
          applyTime={this.applyTime}
          commonlyUsedRanges={commonlyUsedRanges}
          dateFormat={dateFormat}
          recentlyUsedRanges={recentlyUsedRanges}
        />
        {this.renderCustomQuickSelectPanels()}
      </Fragment>
    );
  };

  renderCustomQuickSelectPanels = () => {
    const { customQuickSelectPanels } = this.props;
    if (!customQuickSelectPanels) {
      return null;
    }

    return customQuickSelectPanels.map(({ title, content }) => {
      return (
        <Fragment key={title}>
          <EuiTitle size="xxxs">
            <span>{title}</span>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" className="euiQuickSelectPopover__section">
            {React.cloneElement(content, { applyTime: this.applyTime })}
          </EuiText>
          <EuiHorizontalRule margin="s" />
        </Fragment>
      );
    });
  };

  render() {
    const {
      applyRefreshInterval,
      isAutoRefreshOnly,
      isDisabled,
      isPaused,
      refreshInterval,
    } = this.props;
    const { isOpen } = this.state;

    const quickSelectButton = (
      <EuiButtonEmpty
        className="euiFormControlLayout__prepend"
        textProps={{ className: 'euiQuickSelectPopover__buttonText' }}
        onClick={this.togglePopover}
        aria-label="Date quick select"
        size="xs"
        iconType="arrowDown"
        iconSide="right"
        isDisabled={isDisabled}
        data-test-subj="superDatePickerToggleQuickMenuButton"
      >
        <EuiIcon type={!isAutoRefreshOnly && isPaused ? 'calendar' : 'clock'} />
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        button={quickSelectButton}
        isOpen={isOpen}
        closePopover={this.closePopover}
        anchorPosition="downLeft"
        anchorClassName="euiQuickSelectPopover__anchor"
      >
        <div className="euiQuickSelectPopover__content" data-test-subj="superDatePickerQuickMenu">
          {this.renderDateTimeSections()}
          <EuiRefreshInterval
            applyRefreshInterval={applyRefreshInterval}
            isPaused={isPaused}
            refreshInterval={refreshInterval}
          />
        </div>
      </EuiPopover>
    );
  }
}

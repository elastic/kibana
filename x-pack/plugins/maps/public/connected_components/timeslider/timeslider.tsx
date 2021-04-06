/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import { EuiButtonIcon, EuiDualRange, EuiRangeTick, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { epochToKbnDateFormat, getTicks } from './time_utils';
import { calcAutoIntervalNear, TimeRange } from '../../../../../../src/plugins/data/common';
import { getTimeFilter } from '../../kibana_services';
import { Timeslice } from '../../../common/descriptor_types';
import { NextTimesliceIcon } from './next_timeslice_icon';
import { PreviousTimesliceIcon } from './previous_timeslice_icon';

const NUM_TICKS = 6;
const MAX_TICKS = 7;

export interface Props {
  closeTimeslider: () => void;
  setTimeslice: (timeslice: Timeslice) => void;
  isTimesliderOpen: boolean;
  timeRange: TimeRange;
}

interface State {
  max: number;
  min: number;
  range: number;
  timeslice: number[];
  timesliceText: string;
  ticks: EuiRangeTick[];
}

function prettyPrintTimeslice(timeslice: number[]) {
  return `${epochToKbnDateFormat(timeslice[0])} - ${epochToKbnDateFormat(timeslice[1])}`;
}

// Why Timeslider and KeyedTimeslider?
// Using react 'key' property to ensure new KeyedTimeslider instance whenever props.timeRange changes
export function Timeslider(props: props) {
  return props.isTimesliderOpen ? (
    <KeyedTimeslider key={`${props.timeRange.from}-${props.timeRange.to}`} {...props} />
  ) : null;
}

class KeyedTimeslider extends Component<Props, State> {
  private _isMounted: boolean = false;

  constructor(props: Props) {
    super(props);
    const timeRangeBounds = getTimeFilter().calculateBounds(props.timeRange);
    const duration = timeRangeBounds.max - timeRangeBounds.min;
    let interval = calcAutoIntervalNear(NUM_TICKS, duration);
    // Sometimes auto interval is not quite right and returns 2X or 3X requested ticks
    // Adjust the interval to get the requested number of ticks
    const actualTicks = duration / interval;
    if (actualTicks > MAX_TICKS) {
      const factor = Math.ceil(actualTicks / NUM_TICKS);
      interval *= factor;
    }
    const min = timeRangeBounds.min.valueOf();
    const max = timeRangeBounds.max.valueOf();
    const timeslice = [min, max];

    this.state = {
      max,
      min,
      range: interval,
      ticks: getTicks(min, max, interval),
      timeslice,
      timesliceText: prettyPrintTimeslice(timeslice),
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _doesTimesliceCoverTimerange() {
    return this.state.timeslice[0] === this.state.min && this.state.timeslice[1] === this.state.max;
  }

  _onDualControlChange = (value: number[]) => {
    this.setState({ range: value[1] - value[0] }, () => {
      this._onChange(value);
    });
  };

  _onChange = (value: number[]) => {
    this.setState({
      timeslice: value,
      timesliceText: prettyPrintTimeslice(value),
    });
    this._propagateChange(value);
  };

  _onNext = () => {
    const from =
      this._doesTimesliceCoverTimerange() || this.state.timeslice[1] === this.state.max
        ? this.state.ticks[0].value
        : this.state.timeslice[1];
    const to = from + this.state.range;
    this._onChange([from, to <= this.state.max ? to : this.state.max]);
  };

  _onPrevious = () => {
    const to =
      this._doesTimesliceCoverTimerange() || this.state.timeslice[0] === this.state.min
        ? this.state.ticks[this.state.ticks.length - 1].value
        : this.state.timeslice[0];
    const from = to - this.state.range;
    this._onChange([from < this.state.min ? this.state.min : from, to]);
  };

  _propagateChange = _.debounce((value: number[]) => {
    if (this._isMounted) {
      this.props.setTimeslice({ from: value[0], to: value[1] });
    }
  }, 300);

  render() {
    return (
      <div className="mapTimeslider">
        <div className="mapTimeslider__row">
          <EuiButtonIcon
            onClick={this.props.closeTimeslider}
            iconType="cross"
            color="subdued"
            className="mapTimeslider__close"
            aria-label="Close timeslider"
          />

          <div className="mapTimeslider__timeWindow">
            <EuiText size="s">{this.state.timesliceText}</EuiText>
          </div>

          <div className="mapTimeslider__innerPanel">
            <div className="mapTimeslider__controls">
              <EuiButtonIcon
                onClick={this._onPrevious}
                iconType={PreviousTimesliceIcon}
                color="text"
                aria-label="Previous time window"
              />
              <EuiButtonIcon
                onClick={this._onNext}
                iconType={NextTimesliceIcon}
                color="text"
                aria-label="Next time window"
              />
            </div>
          </div>
        </div>

        <div className="mapTimeslider__row">
          <EuiDualRange
            fullWidth={true}
            value={this.state.timeslice}
            onChange={this._onDualControlChange}
            showTicks={true}
            min={this.state.min}
            max={this.state.max}
            step={1}
            ticks={this.state.ticks}
          />
        </div>
      </div>
    );
  }
}

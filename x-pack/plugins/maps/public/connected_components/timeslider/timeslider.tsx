/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import { EuiButtonIcon, EuiDualRange, EuiRangeTick } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getTicks } from './get_ticks';
import { calcAutoIntervalNear, TimeRange } from '../../../../../../src/plugins/data/common';
import { getTimeFilter } from '../../kibana_services';
import { Timeslice } from '../../../common/descriptor_types';

const NUM_TICKS = 6;
const MAX_TICKS = 8;

export interface Props {
  closeTimeslider: () => void;
  setTimeslice: (timeslice: Timeslice) => void;
  isTimesliderOpen: boolean;
  timeRange: TimeRange;
}

interface State {
  interval: number;
  max: number;
  min: number;
  timeslice: number[];
  ticks: EuiRangeTick[];
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

    this.state = {
      interval,
      max,
      min,
      ticks: getTicks(min, max, interval),
      timeslice: [min, max],
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _onChange = (value: number[]) => {
    this.setState({ timeslice: value });
    this._propagateChange(value);
  };

  _propagateChange = _.debounce((value: number[]) => {
    if (this._isMounted) {
      this.props.setTimeslice({ from: value[0], to: value[1] });
    }
  }, 300);

  render() {
    return (
      <div className="mapTimeslider">
        <div className="kbnMapsTimeslider__row">
          <EuiButtonIcon
            onClick={this.props.closeTimeslider}
            iconType="cross"
            color="subdued"
            className="mapTimeslider__close"
            aria-label="Close timeslider"
          />
        </div>

        <div className="mapTimeslider__row">
          <EuiDualRange
            fullWidth={true}
            value={this.state.timeslice}
            onChange={this._onChange}
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

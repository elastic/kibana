/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { EuiButtonIcon, EuiDualRange, EuiText } from '@elastic/eui';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';
import { i18n } from '@kbn/i18n';
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { epochToKbnDateFormat, getInterval, getTicks, getTimeRanges } from './time_utils';
import { TimeRange, TimeRangeBounds } from '../../../../../../src/plugins/data/common';
import { getTimeFilter } from '../../kibana_services';
import { Timeslice } from '../../../common/descriptor_types';
import { TimeSliderPopover } from './timeslider_popover';

export interface Props {
  closeTimeslider: () => void;
  setTimeslice: (timeslice: Timeslice) => void;
  isTimesliderOpen: boolean;
  timeRange: TimeRange;
  waitForTimesliceToLoad$: Observable<void>;
  setTimeRangeStep: (timeRangeStep: number) => void;
  timeRangeStep: number;
}

interface State {
  isPaused: boolean;
  max: number;
  min: number;
  range: number;
  timeslice: [number, number];
  ticks: EuiRangeTick[];
}

function prettyPrintTimeslice(timeslice: [number, number]) {
  return `${epochToKbnDateFormat(timeslice[0])} - ${epochToKbnDateFormat(timeslice[1])}`;
}

// Why Timeslider and KeyedTimeslider?
// Using react 'key' property to ensure new KeyedTimeslider instance whenever props.timeRange changes
export function Timeslider(props: Props) {
  return props.isTimesliderOpen ? (
    <KeyedTimeslider key={`${props.timeRange.from}-${props.timeRange.to}`} {...props} />
  ) : null;
}

class KeyedTimeslider extends Component<Props, State> {
  private _isMounted: boolean = false;
  private _timeoutId: number | undefined;
  private _subscription: Subscription | undefined;
  defaultRange: {
    timeRangeBounds: TimeRangeBounds;
  };

  constructor(props: Props) {
    super(props);
    const timeRangeBounds = getTimeFilter().calculateBounds(props.timeRange);
    if (timeRangeBounds.min === undefined || timeRangeBounds.max === undefined) {
      throw new Error(
        'Unable to create Timeslider component, timeRangeBounds min or max are undefined'
      );
    }
    const min = timeRangeBounds.min.valueOf();
    const max = timeRangeBounds.max.valueOf();
    const interval = getInterval(min, max);

    const ranges = getTimeRanges(timeRangeBounds);
    const hasMatch =
      ranges.filter((val) => {
        return val.ms === props.timeRangeStep;
      }).length > 0;

    let updatedInterval =
      props.timeRangeStep > 1 && max - min > props.timeRangeStep ? props.timeRangeStep : interval;
    const ticks = getTicks(min, max, interval);

    if (!hasMatch) {
      this.props.setTimeRangeStep(1);
      updatedInterval = interval;
    }

    this.defaultRange = {
      timeRangeBounds,
    };

    const timeslice: [number, number] = [ticks[0].value, ticks[0].value + updatedInterval];

    this.state = {
      isPaused: true,
      max,
      min,
      range: updatedInterval,
      ticks,
      timeslice,
    };
  }

  componentWillUnmount() {
    this._onPause();
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _doesTimesliceCoverTimerange() {
    return this.state.timeslice[0] === this.state.min && this.state.timeslice[1] === this.state.max;
  }

  _onDualControlChange = (value: [number | string, number | string]) => {
    this.setState({ range: (value[1] as number) - (value[0] as number) }, () => {
      this._onChange(value as [number, number]);
    });
  };

  _onChange = (value: [number, number]) => {
    this.setState({
      timeslice: value,
    });
    this._propagateChange(value);
  };

  _onNext = () => {
    let lastTick = this.state.max;
    if (this.props.timeRangeStep !== 1) {
      lastTick = this.state.ticks[this.state.ticks.length - 1].value;
    }
    const from =
      this._doesTimesliceCoverTimerange() || this.state.timeslice[1] === lastTick
        ? this.state.ticks[0].value
        : this.state.timeslice[1];
    const to = from + this.state.range;
    this._onChange([from, to <= lastTick ? to : lastTick]);
  };

  _onPrevious = () => {
    let firstTick = this.state.min;
    if (this.props.timeRangeStep !== 1) {
      firstTick = this.state.ticks[0].value;
    }
    const to =
      this._doesTimesliceCoverTimerange() || this.state.timeslice[0] === firstTick
        ? this.state.ticks[this.state.ticks.length - 1].value
        : this.state.timeslice[0];
    const from = to - this.state.range;
    this._onChange([from < firstTick ? firstTick : from, to]);
  };

  _propagateChange = _.debounce((value: [number, number]) => {
    if (this._isMounted) {
      this.props.setTimeslice({ from: value[0], to: value[1] });
    }
  }, 300);

  _onPlay = () => {
    this.setState({ isPaused: false });
    this._playNextFrame();
  };

  _onPause = () => {
    this.setState({ isPaused: true });
    if (this._subscription) {
      this._subscription.unsubscribe();
      this._subscription = undefined;
    }
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = undefined;
    }
  };

  _playNextFrame() {
    // advance to next frame
    this._onNext();

    // use waitForTimesliceToLoad$ observable to wait until next frame loaded
    // .pipe(first()) waits until the first value is emitted from an observable and then automatically unsubscribes
    this._subscription = this.props.waitForTimesliceToLoad$.pipe(first()).subscribe(() => {
      if (this.state.isPaused) {
        return;
      }

      // use timeout to display frame for small time period before moving to next frame
      this._timeoutId = window.setTimeout(() => {
        if (this.state.isPaused) {
          return;
        }
        this._playNextFrame();
      }, 1750);
    });
  }

  _updateTimeRange = (data: { label: string; ms: number }) => {
    const interval = getInterval(this.state.min, this.state.max);
    const updatedTicks = getTicks(this.state.min, this.state.max, interval);
    this.setState({
      ticks: updatedTicks,
      range: data.ms > 1 ? data.ms : interval,
    });
    this._onChange([
      updatedTicks[0].value,
      updatedTicks[0].value + (data.ms > 1 ? data.ms : interval),
    ]);
    this.props.setTimeRangeStep(data.ms);
  };

  render() {
    return (
      <div className="mapTimeslider mapTimeslider--animation">
        <div className="mapTimeslider__row">
          <EuiButtonIcon
            onClick={this.props.closeTimeslider}
            iconType="cross"
            color="text"
            className="mapTimeslider__close"
            aria-label={i18n.translate('xpack.maps.timeslider.closeLabel', {
              defaultMessage: 'Close timeslider',
            })}
          />

          <TimeSliderPopover
            timeRangeBounds={this.defaultRange.timeRangeBounds}
            timeRangeStep={this.props.timeRangeStep}
            handler={this._updateTimeRange}
          />

          <div className="mapTimeslider__timeWindow">
            <EuiText size="s">{prettyPrintTimeslice(this.state.timeslice)}</EuiText>
          </div>

          <div className="mapTimeslider__innerPanel">
            <div className="mapTimeslider__controls">
              <EuiButtonIcon
                onClick={this._onPrevious}
                iconType="framePrevious"
                color="text"
                aria-label={i18n.translate('xpack.maps.timeslider.previousTimeWindowLabel', {
                  defaultMessage: 'Previous time window',
                })}
              />
              <EuiButtonIcon
                className="mapTimeslider__playButton"
                onClick={this.state.isPaused ? this._onPlay : this._onPause}
                iconType={this.state.isPaused ? 'playFilled' : 'pause'}
                size="s"
                display="fill"
                aria-label={
                  this.state.isPaused
                    ? i18n.translate('xpack.maps.timeslider.playLabel', {
                        defaultMessage: 'Play',
                      })
                    : i18n.translate('xpack.maps.timeslider.pauseLabel', {
                        defaultMessage: 'Pause',
                      })
                }
              />
              <EuiButtonIcon
                onClick={this._onNext}
                iconType="frameNext"
                color="text"
                aria-label={i18n.translate('xpack.maps.timeslider.nextTimeWindowLabel', {
                  defaultMessage: 'Next time window',
                })}
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
            isDraggable
          />
        </div>
      </div>
    );
  }
}

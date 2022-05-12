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
import { TimeRange } from '@kbn/data-plugin/common';
import { epochToKbnDateFormat, getInterval, getTicks } from './time_utils';
import { getTimeFilter } from '../../kibana_services';
import { Timeslice } from '../../../common/descriptor_types';

export interface Props {
  closeTimeslider: () => void;
  setTimeslice: (timeslice: Timeslice) => void;
  isTimesliderOpen: boolean;
  timeRange: TimeRange;
  waitForTimesliceToLoad$: Observable<void>;
  updateGlobalTimeRange: (timeslice: number[]) => void;
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
    const timeslice: [number, number] = [min, max];

    this.state = {
      isPaused: true,
      max,
      min,
      range: interval,
      ticks: getTicks(min, max, interval),
      timeslice,
    };
  }

  componentWillUnmount() {
    this._onPause();
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    // auto-select range between first tick and second tick
    this._onChange([this.state.ticks[0].value, this.state.ticks[1].value]);
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

          <div className="mapTimeslider__timeWindow">
            <EuiText size="s">{prettyPrintTimeslice(this.state.timeslice)}</EuiText>
          </div>

          <EuiButtonIcon
            onClick={() => {
              this.props.updateGlobalTimeRange(this.state.timeslice);
            }}
            iconType="calendar"
            aria-label={i18n.translate('xpack.maps.timeslider.setGlobalTime', {
              defaultMessage: 'Set global time to {timeslice}',
              values: { timeslice: prettyPrintTimeslice(this.state.timeslice) },
            })}
            title={i18n.translate('xpack.maps.timeslider.setGlobalTime', {
              defaultMessage: 'Set global time to {timeslice}',
              values: { timeslice: prettyPrintTimeslice(this.state.timeslice) },
            })}
          />

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

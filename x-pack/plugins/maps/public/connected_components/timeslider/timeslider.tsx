/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  ControlGroupContainer,
  type ControlGroupInput,
  type controlGroupInputBuilder,
  LazyControlGroupRenderer,
} from '@kbn/controls-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { first } from 'rxjs/operators';
import type { TimeRange } from '@kbn/es-query';
import { Timeslice } from '../../../common/descriptor_types';

const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

export interface Props {
  setTimeslice: (timeslice?: Timeslice) => void;
  timeRange: TimeRange;
  waitForTimesliceToLoad$: Observable<void>;
}

export class Timeslider extends Component<Props, {}> {
  private _isMounted: boolean = false;
  private readonly _subscriptions = new Subscription();

  componentWillUnmount() {
    this._isMounted = false;
    this._subscriptions.unsubscribe();
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _getInitialInput = async (
    initialInput: Partial<ControlGroupInput>,
    builder: typeof controlGroupInputBuilder
  ) => {
    builder.addTimeSliderControl(initialInput);
    return {
      ...initialInput,
      viewMode: ViewMode.VIEW,
      timeRange: this.props.timeRange,
    };
  };

  _onLoadComplete = (controlGroup: ControlGroupContainer) => {
    if (!this._isMounted) {
      return;
    }

    this._subscriptions.add(
      controlGroup
        .getOutput$()
        .pipe(
          distinctUntilChanged(({ timeslice: timesliceA }, { timeslice: timesliceB }) =>
            _.isEqual(timesliceA, timesliceB)
          )
        )
        .subscribe(({ timeslice }) => {
          // use waitForTimesliceToLoad$ observable to wait until next frame loaded
          // .pipe(first()) waits until the first value is emitted from an observable and then automatically unsubscribes
          this.props.waitForTimesliceToLoad$.pipe(first()).subscribe(() => {
            controlGroup.anyControlOutputConsumerLoading$.next(false);
          });

          this.props.setTimeslice(
            timeslice === undefined
              ? undefined
              : {
                  from: timeslice[0],
                  to: timeslice[1],
                }
          );
        })
    );
  };

  render() {
    return (
      <div className="mapTimeslider mapTimeslider--animation">
        <ControlGroupRenderer
          onLoadComplete={this._onLoadComplete}
          getInitialInput={this._getInitialInput}
          timeRange={this.props.timeRange}
        />
      </div>
    );
  }
}

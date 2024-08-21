/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { Observable, Subscription } from 'rxjs';
import {
  type ControlGroupStateBuilder,
  ControlGroupRenderer,
  type ControlGroupRuntimeState,
  type AwaitingControlGroupAPI,
} from '@kbn/controls-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { Timeslice } from '../../../common/descriptor_types';

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

  _getCreationOptions = async (
    initialState: Partial<ControlGroupRuntimeState>,
    builder: ControlGroupStateBuilder
  ) => {
    builder.addTimeSliderControl(initialState);
    return {
      initialState,
    };
  };

  _onLoadComplete = (controlGroup: AwaitingControlGroupAPI) => {
    if (!this._isMounted || !controlGroup) {
      return;
    }

    this._subscriptions.add(
      controlGroup.timeslice$.subscribe((timeslice) => {
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
          ref={this._onLoadComplete}
          getCreationOptions={this._getCreationOptions}
          timeRange={this.props.timeRange}
        />
      </div>
    );
  }
}

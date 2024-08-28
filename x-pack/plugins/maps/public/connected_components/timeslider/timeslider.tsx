/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { Observable, Subscription, switchMap, tap } from 'rxjs';
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
  private dataLoading = true;

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
      controlGroup.timeslice$
        .pipe(
          tap(() => {
            this.dataLoading = true;
          }),
          switchMap((timeslice) => {
            this.props.setTimeslice(
              timeslice === undefined
                ? undefined
                : {
                    from: timeslice[0],
                    to: timeslice[1],
                  }
            );
            return this.props.waitForTimesliceToLoad$;
          })
        )
        .subscribe(() => {
          this.dataLoading = false;
        })
    );
  };

  render() {
    return (
      <div className="mapTimeslider mapTimeslider--animation">
        <ControlGroupRenderer
          onApiAvailable={this._onLoadComplete}
          dataLoading={this.dataLoading}
          getCreationOptions={this._getCreationOptions}
          timeRange={this.props.timeRange}
        />
      </div>
    );
  }
}

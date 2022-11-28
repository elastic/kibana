/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import uuid from 'uuid/v4';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { EuiButtonIcon, EuiDualRange, EuiText } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { getDefaultControlGroupInput } from '@kbn/controls-plugin/common';
import {
  ControlGroupContainer,
  ControlGroupInput,
  ControlGroupOutput,
  CONTROL_GROUP_TYPE,
} from '@kbn/controls-plugin/public';
import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';
import type { TimeRange } from '@kbn/es-query';
import { getEmbeddableService, getTimeFilter } from '../../kibana_services';
import { Timeslice } from '../../../common/descriptor_types';

export interface Props {
  setTimeslice: (timeslice: Timeslice) => void;
  timeRange: TimeRange;
  waitForTimesliceToLoad$: Observable<void>;
}

export class Timeslider extends Component<Props, {}> {
  private _isMounted: boolean = false;
  private _isRendered: boolean = false;
  private _controlGroup?: ControlGroupContainer | undefined;
  private readonly _controlGroupRef: RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();
  private readonly _subscriptions = new Subscription();

  componentWillUnmount() {
    this._isMounted = false;
    this._subscriptions.unsubscribe();
  }

  componentDidUpdate() {
    if (!this._isRendered && this._controlGroup && this._controlGroupRef.current) {
      this._isRendered = true;
      this._controlGroup.render(this._controlGroupRef.current);
    }

    if (this._controlGroup && !_.isEqual(this._controlGroup.getInput().timeRange, this.props.timeRange)) {
      this._controlGroup.updateInput({
        timeRange: this.props.timeRange
      });
    }
  }

  componentDidMount() {
    this._isMounted = true;
    this._load();
  }

  async _load() {
    const embeddableService = getEmbeddableService();
    const controlsGroupFactory = embeddableService.getEmbeddableFactory<
      ControlGroupInput,
      ControlGroupOutput,
      ControlGroupContainer
    >(CONTROL_GROUP_TYPE);
    const timesliderId = uuid();
    this._controlGroup = await controlsGroupFactory?.create({
      id: uuid(),
      ...getDefaultControlGroupInput(),
      panels: {
        [timesliderId]: {
          explicitInput: {
            id: timesliderId,
            title: 'timeslider'
          },
          grow: true,
          order: 0,
          type: 'timeSlider',
          width: 'large'
        }
      },
      viewMode: ViewMode.VIEW,
      timeRange: this.props.timeRange,
    });

    if (!this._isMounted) {
      return;
    }

    this._subscriptions.add(
      this._controlGroup
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
            this._controlGroup.anyControlOutputConsumerLoading$.next(false);
          });

          this.props.setTimeslice(timeslice === undefined 
            ?  undefined
            :
              {
                from: timeslice[0],
                to: timeslice[1],
              });
        })
    );

    if (this._controlGroupRef.current) {
      this._controlGroup.render(this._controlGroupRef.current);
    }
  }

  render() {
    return <div className="mapTimeslider mapTimeslider--animation" ref={this._controlGroupRef}/>;
  }
}

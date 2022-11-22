/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import uuid from 'uuid/v4';
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
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import type { TimeRange } from '@kbn/es-query';
import { getEmbeddableService, getTimeFilter } from '../../kibana_services';
import { Timeslice } from '../../../common/descriptor_types';

export interface Props {
  closeTimeslider: () => void;
  setTimeslice: (timeslice: Timeslice) => void;
  isTimesliderOpen: boolean;
  timeRange: TimeRange;
  waitForTimesliceToLoad$: Observable<void>;
}

export class Timeslider extends Component<Props, {}> {
  private _isMounted: boolean = false;
  private _isRendered: boolean = false;
  private _controlGroup?: ControlGroupContainer | undefined;
  private readonly _controlGroupRef: RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();
  private _subscription: Subscription | undefined;

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (!this._isRendered && this._controlGroup && this._controlGroupRef.current) {
      this._isRendered = true;
      this._controlGroup.render(this._controlGroupRef.current);
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

    if (this._controlGroupRef.current) {
      this._controlGroup.render(this._controlGroupRef.current);
    }
  }

  _propagateChange = _.debounce((value: [number, number]) => {
    if (this._isMounted) {
      this.props.setTimeslice({ from: value[0], to: value[1] });
    }
  }, 300);

  /*_playNextFrame() {
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
  }*/

  render() {
    return this.props.isTimesliderOpen
      ? <div className="mapTimeslider mapTimeslider--animation" ref={this._controlGroupRef}/>
      : null;
  }
}

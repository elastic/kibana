/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { MBMapContainer } from '../map/mb';
import { WidgetOverlay } from '../widget_overlay/index';
import { LayerPanel } from '../layer_panel/index';
import { AddLayerPanel } from '../layer_addpanel/index';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Toasts } from '../toasts';

import { timeService } from '../../kibana_services';

export class GisMap extends Component {

  componentDidMount() {
    timeService.on('timeUpdate', this.props.setTimeFiltersToKbnGlobalTime);
    timeService.on('refreshIntervalUpdate', this.setRefreshTimer);
    this.setRefreshTimer();
  }

  componentWillUnmount() {
    timeService.off('timeUpdate', this.props.setTimeFiltersToKbnGlobalTime);
    timeService.off('refreshIntervalUpdate', this.setRefreshTimer);
    this.clearRefreshTimer();
  }

  setRefreshTimer = () => {
    this.clearRefreshTimer();

    const { value, pause } = timeService.getRefreshInterval();
    if (!pause && value > 0) {
      this.refreshTimerId = setInterval(
        () => {
          this.props.triggerRefreshTimer();
        },
        value
      );
    }

    this.props.setRefreshConfig({
      isPaused: pause,
      interval: value,
    });
  }

  clearRefreshTimer = () => {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
    }
  }

  render() {
    const {
      layerDetailsVisible,
      addLayerVisible,
      noFlyoutVisible
    } = this.props;

    let currentPanel;
    let currentPanelClassName;

    if (noFlyoutVisible) {
      currentPanel = null;
    } else if (addLayerVisible) {
      currentPanelClassName = "gisLayerPanel-isVisible";
      currentPanel = <AddLayerPanel/>;
    } else if (layerDetailsVisible) {
      currentPanelClassName = "gisLayerPanel-isVisible";
      currentPanel = (
        <LayerPanel/>
      );
    }
    return (
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem className="gisMapWrapper">
          <MBMapContainer/>
          <WidgetOverlay/>
        </EuiFlexItem>

        <EuiFlexItem className={`gisLayerPanel ${currentPanelClassName}`} grow={false}>
          {currentPanel}
        </EuiFlexItem>

        <Toasts/>
      </EuiFlexGroup>
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import classNames from 'classnames';
import { EuiFlexGroup, EuiFlexItem, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import { Filter } from 'src/plugins/data/public';
// @ts-expect-error
import { MBMap } from '../map/mb';
// @ts-expect-error
import { WidgetOverlay } from '../widget_overlay';
// @ts-expect-error
import { ToolbarOverlay } from '../toolbar_overlay';
// @ts-expect-error
import { LayerPanel } from '../layer_panel';
import { AddLayerPanel } from '../add_layer_panel';
import { ExitFullScreenButton } from '../../../../../../src/plugins/kibana_react/public';
import { getIndexPatternsFromIds } from '../../index_pattern_util';
import { ES_GEO_FIELD_TYPE } from '../../../common/constants';
import { indexPatterns as indexPatternsUtils } from '../../../../../../src/plugins/data/public';
import { FLYOUT_STATE } from '../../reducers/ui';
import { MapSettingsPanel } from '../map_settings_panel';
import { registerLayerWizards } from '../../classes/layers/load_layer_wizards';
import { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import { GeoFieldWithIndex } from '../../components/geo_field_with_index';
import { MapRefreshConfig } from '../../../common/descriptor_types';
import 'mapbox-gl/dist/mapbox-gl.css';

const RENDER_COMPLETE_EVENT = 'renderComplete';

interface Props {
  addFilters: ((filters: Filter[]) => void) | null;
  areLayersLoaded: boolean;
  cancelAllInFlightRequests: () => void;
  exitFullScreen: () => void;
  flyoutDisplay: FLYOUT_STATE;
  hideToolbarOverlay: boolean;
  isFullScreen: boolean;
  indexPatternIds: string[];
  mapInitError: string | null | undefined;
  refreshConfig: MapRefreshConfig;
  renderTooltipContent?: RenderToolTipContent;
  triggerRefreshTimer: () => void;
}

interface State {
  isInitialLoadRenderTimeoutComplete: boolean;
  domId: string;
  geoFields: GeoFieldWithIndex[];
}

export class MapContainer extends Component<Props, State> {
  private _isMounted: boolean = false;
  private _isInitalLoadRenderTimerStarted: boolean = false;
  private _prevIndexPatternIds: string[] = [];
  private _refreshTimerId: number | null = null;
  private _prevIsPaused: boolean | null = null;
  private _prevInterval: number | null = null;

  state: State = {
    isInitialLoadRenderTimeoutComplete: false,
    domId: uuid(),
    geoFields: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._setRefreshTimer();
    registerLayerWizards();
  }

  componentDidUpdate() {
    this._setRefreshTimer();
    if (this.props.areLayersLoaded && !this._isInitalLoadRenderTimerStarted) {
      this._isInitalLoadRenderTimerStarted = true;
      this._startInitialLoadRenderTimer();
    }

    if (!!this.props.addFilters) {
      this._loadGeoFields(this.props.indexPatternIds);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._clearRefreshTimer();
    this.props.cancelAllInFlightRequests();
  }

  // Reporting uses both a `data-render-complete` attribute and a DOM event listener to determine
  // if a visualization is done loading. The process roughly is:
  // - See if the `data-render-complete` attribute is "true". If so we're done!
  // - If it's not, then reporting injects a listener into the browser for a custom "renderComplete" event.
  // - When that event is fired, we snapshot the viz and move on.
  // Failure to not have the dom attribute, or custom event, will timeout the job.
  // See x-pack/plugins/reporting/export_types/common/lib/screenshots/wait_for_render.ts for more.
  _onInitialLoadRenderComplete = () => {
    const el = document.querySelector(`[data-dom-id="${this.state.domId}"]`);

    if (el) {
      el.dispatchEvent(new CustomEvent(RENDER_COMPLETE_EVENT, { bubbles: true }));
    }
  };

  _loadGeoFields = async (nextIndexPatternIds: string[]) => {
    if (_.isEqual(nextIndexPatternIds, this._prevIndexPatternIds)) {
      // all ready loaded index pattern ids
      return;
    }

    this._prevIndexPatternIds = nextIndexPatternIds;

    const geoFields: GeoFieldWithIndex[] = [];
    const indexPatterns = await getIndexPatternsFromIds(nextIndexPatternIds);
    indexPatterns.forEach((indexPattern) => {
      indexPattern.fields.forEach((field) => {
        if (
          indexPattern.id &&
          !indexPatternsUtils.isNestedField(field) &&
          (field.type === ES_GEO_FIELD_TYPE.GEO_POINT || field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE)
        ) {
          geoFields.push({
            geoFieldName: field.name,
            geoFieldType: field.type,
            indexPatternTitle: indexPattern.title,
            indexPatternId: indexPattern.id,
          });
        }
      });
    });

    if (!this._isMounted) {
      return;
    }

    this.setState({ geoFields });
  };

  _setRefreshTimer = () => {
    const { isPaused, interval } = this.props.refreshConfig;

    if (this._prevIsPaused === isPaused && this._prevInterval === interval) {
      // refreshConfig is the same, nothing to do
      return;
    }

    this._prevIsPaused = isPaused;
    this._prevInterval = interval;

    this._clearRefreshTimer();

    if (!isPaused && interval > 0) {
      this._refreshTimerId = window.setInterval(() => {
        this.props.triggerRefreshTimer();
      }, interval);
    }
  };

  _clearRefreshTimer = () => {
    if (this._refreshTimerId) {
      window.clearInterval(this._refreshTimerId);
      this._refreshTimerId = null;
    }
  };

  // Mapbox does not provide any feedback when rendering is complete.
  // Temporary solution is just to wait set period of time after data has loaded.
  _startInitialLoadRenderTimer = () => {
    window.setTimeout(() => {
      if (this._isMounted) {
        this.setState({ isInitialLoadRenderTimeoutComplete: true });
        this._onInitialLoadRenderComplete();
      }
    }, 5000);
  };

  render() {
    const {
      addFilters,
      flyoutDisplay,
      isFullScreen,
      exitFullScreen,
      mapInitError,
      renderTooltipContent,
    } = this.props;

    if (mapInitError) {
      return (
        <div data-render-complete data-shared-item>
          <EuiCallOut
            title={i18n.translate('xpack.maps.map.initializeErrorTitle', {
              defaultMessage: 'Unable to initialize map',
            })}
            color="danger"
            iconType="cross"
          >
            <p>{mapInitError}</p>
          </EuiCallOut>
        </div>
      );
    }

    let flyoutPanel = null;
    if (flyoutDisplay === FLYOUT_STATE.ADD_LAYER_WIZARD) {
      flyoutPanel = <AddLayerPanel />;
    } else if (flyoutDisplay === FLYOUT_STATE.LAYER_PANEL) {
      flyoutPanel = <LayerPanel />;
    } else if (flyoutDisplay === FLYOUT_STATE.MAP_SETTINGS_PANEL) {
      flyoutPanel = <MapSettingsPanel />;
    }

    let exitFullScreenButton;
    if (isFullScreen) {
      exitFullScreenButton = <ExitFullScreenButton onExitFullScreenMode={exitFullScreen} />;
    }
    return (
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        data-dom-id={this.state.domId}
        data-render-complete={this.state.isInitialLoadRenderTimeoutComplete}
        data-shared-item
      >
        <EuiFlexItem className="mapMapWrapper">
          <MBMap
            addFilters={addFilters}
            geoFields={this.state.geoFields}
            renderTooltipContent={renderTooltipContent}
          />
          {!this.props.hideToolbarOverlay && (
            <ToolbarOverlay addFilters={addFilters} geoFields={this.state.geoFields} />
          )}
          <WidgetOverlay />
        </EuiFlexItem>

        <EuiFlexItem
          className={classNames('mapMapLayerPanel', {
            'mapMapLayerPanel-isVisible': !!flyoutPanel,
          })}
          grow={false}
        >
          {flyoutPanel}
        </EuiFlexItem>

        {exitFullScreenButton}
      </EuiFlexGroup>
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { ScopedHistory } from '@kbn/core/public';
import { getToasts } from '../../kibana_services';
import { MapsListView } from './maps_list_view';
import { APP_ID } from '../../../common/constants';
import type { MapItem } from '../../../common/content_management';

interface Props {
  history: ScopedHistory;
  stateTransfer: EmbeddableStateTransfer;
}

export class LoadListAndRender extends PureComponent<Props> {
  state = {
    mapsLoaded: false,
    hasSavedMaps: false,
  };

  componentDidMount() {
    this.props.stateTransfer.clearEditorState(APP_ID);
  }

  /**
   * Handler to execute every time the maps are loaded in the list. If there is a filter applied when
   * searching for the maps we will mark the state "hasSavedMaps" to `true`, we don't want to redirect
   * to "/map" in that case.
   *
   * @param err Possible error while loading the maps
   * @param maps The maps loaded
   * @param isFiltered Flag to indicate if there is a filter applied to the loaded maps
   */
  onMapsLoaded = (err: null | any, maps: MapItem[], isFiltered = false) => {
    if (err !== null) {
      getToasts().addDanger({
        title: i18n.translate('xpack.maps.mapListing.errorAttemptingToLoadSavedMaps', {
          defaultMessage: `Unable to load maps`,
        }),
        text: `${err}`,
      });
    }

    this.setState({
      mapsLoaded: true,
      hasSavedMaps: isFiltered ? true : maps.length > 0,
    });
  };

  render() {
    const { mapsLoaded, hasSavedMaps } = this.state;

    if (mapsLoaded && !hasSavedMaps) {
      return <Redirect to="/map" />;
    }

    return <MapsListView history={this.props.history} onMapsLoaded={this.onMapsLoaded} />;
  }
}

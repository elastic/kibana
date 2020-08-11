/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MapsAppView } from '.';
import { getMapsSavedObjectLoader } from '../../bootstrap/services/gis_map_saved_object_loader';
import { getCoreChrome, getToasts } from '../../../kibana_services';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';

export const LoadMapAndRender = class extends React.Component {
  state = {
    savedMap: null,
    failedToLoad: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadSavedMap();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadSavedMap() {
    try {
      const savedMap = await getMapsSavedObjectLoader().get(this.props.savedMapId);
      if (this._isMounted) {
        getCoreChrome().docTitle.change(savedMap.title);
        if (this.props.savedMapId) {
          getCoreChrome().recentlyAccessed.add(savedMap.getFullPath(), savedMap.title, savedMap.id);
        }
        this.setState({ savedMap });
      }
    } catch (err) {
      if (this._isMounted) {
        this.setState({ failedToLoad: true });
        getToasts().addWarning({
          title: i18n.translate('xpack.maps.loadMap.errorAttemptingToLoadSavedMap', {
            defaultMessage: `Unable to load map`,
          }),
          text: `${err.message}`,
        });
      }
    }
  }

  render() {
    const { savedMap, failedToLoad } = this.state;

    if (failedToLoad) {
      return <Redirect to="/" />;
    }

    return savedMap ? <MapsAppView savedMap={savedMap} onAppLeave={this.props.onAppLeave} /> : null;
  }
};

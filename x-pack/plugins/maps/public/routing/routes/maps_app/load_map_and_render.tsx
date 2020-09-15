/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import { AppMountParameters } from 'kibana/public';
import { EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import { getCoreChrome, getToasts } from '../../../kibana_services';
import { getMapsSavedObjectLoader } from '../../bootstrap/services/gis_map_saved_object_loader';
import { MapsAppView } from '.';
import { ISavedGisMap } from '../../bootstrap/services/saved_gis_map';

interface Props {
  savedMapId?: string;
  onAppLeave: AppMountParameters['onAppLeave'];
  stateTransfer: EmbeddableStateTransfer;
  originatingApp?: string;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

interface State {
  savedMap?: ISavedGisMap;
  failedToLoad: boolean;
}

export const LoadMapAndRender = class extends React.Component<Props, State> {
  _isMounted: boolean = false;
  state: State = {
    savedMap: undefined,
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

    return savedMap ? (
      <MapsAppView
        savedMap={savedMap}
        onAppLeave={this.props.onAppLeave}
        setHeaderActionMenu={this.props.setHeaderActionMenu}
        stateTransfer={this.props.stateTransfer}
        originatingApp={this.props.originatingApp}
      />
    ) : null;
  }
};

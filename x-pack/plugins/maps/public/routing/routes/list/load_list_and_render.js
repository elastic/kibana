/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getMapsSavedObjectLoader } from '../../../bootstrap/services/gis_map_saved_object_loader';
import { getToasts } from '../../../kibana_services';
import { i18n } from '@kbn/i18n';
import { MapsListView } from './list';
import { Redirect } from 'react-router-dom';

export const LoadListAndRender = class extends React.Component {
  state = {
    hasSavedMaps: null,
    savedMapsList: null,
  };

  //
  async componentDidMount() {
    try {
      // TODO: Consolidate this check with the first call in list
      const { hits = [] } = await getMapsSavedObjectLoader().find();
      const hasSavedMaps = !!hits.length;
      this.setState({ hasSavedMaps, savedMapsList: hits });
    } catch (err) {
      getToasts().addDanger({
        title: i18n.translate('xpack.maps.mapListing.errorAttemptingToLoadSavedMaps', {
          defaultMessage: `Unable to load maps`,
        }),
        text: `${err}`,
      });
      this.setState({ hasSavedMaps: false, savedMapsList: [] });
    }
  }

  render() {
    const { savedMapsList, hasSavedMaps } = this.state;
    const mapsLoaded = !!savedMapsList;

    if (mapsLoaded) {
      return hasSavedMaps ? <MapsListView /> : <Redirect to="/map" />;
    } else {
      return null;
    }
  }
};

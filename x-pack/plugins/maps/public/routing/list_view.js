/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { MapListing } from '../components/map_listing';
import { getMapsSavedObjectLoader } from '../angular/services/gis_map_saved_object_loader';
import { getMapsCapabilities, getUiSettings } from '../kibana_services';

const listingLimit = getUiSettings().get('savedObjects:listingLimit');

export class MapsListView extends React.Component {
  state = {
    savedMapsList: null,
  };

  async componentDidMount() {
    const { hits = [] } = await getMapsSavedObjectLoader().find();
    this.setState({
      savedMapsList: hits.length ? (
        <MapListing
          find={search => getMapsSavedObjectLoader().find(search, listingLimit)}
          delete={ids => getMapsSavedObjectLoader().delete(ids)}
          listingLimit={listingLimit}
          readOnly={!getMapsCapabilities().save}
        />
      ) : (
        <Redirect to={'/map'} />
      ),
    });
  }

  render() {
    const { savedMapsList } = this.state;
    return savedMapsList;
  }
}

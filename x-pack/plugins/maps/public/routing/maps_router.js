/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createBrowserHistory } from 'history';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { MapListing } from '../components/map_listing';
import { getMapsSavedObjectLoader } from '../angular/services/gis_map_saved_object_loader';
import { getMapsCapabilities, getUiSettings, getCoreI18n } from '../kibana_services';

const history = createBrowserHistory();
const listingLimit = getUiSettings().get('savedObjects:listingLimit');

class SavedMapsList extends React.Component {
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

export function renderApp(context, params) {
  const I18nContext = getCoreI18n().Context;
  render(
    <I18nContext>
      <Router basename={params.appBasePath} history={history}>
        <Switch>
          <Route path="/">
            <SavedMapsList />
          </Route>
        </Switch>
      </Router>
    </I18nContext>,
    params.element
  );

  return () => unmountComponentAtNode(params.element);
}

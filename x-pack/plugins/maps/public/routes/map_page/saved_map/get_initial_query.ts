/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getData } from '../../../kibana_services';
import { MapsAppState } from '../url_state';

export function getInitialQuery({
  mapStateJSON,
  appState = {},
}: {
  mapStateJSON?: string;
  appState: MapsAppState;
}) {
  if (appState.query) {
    return appState.query;
  }

  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.query) {
      return mapState.query;
    }
  }

  return getData().query.queryString.getDefaultQuery();
}

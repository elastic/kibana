/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUiSettings } from '../kibana_services';
import { SEARCH_QUERY_LANGUAGE_SETTINGS } from '../../../../../src/plugins/data/common';

export function getInitialQuery({ mapStateJSON, appState = {}, userQueryLanguage }) {
  const settings = getUiSettings();

  if (appState.query) {
    return appState.query;
  }

  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.query) {
      return mapState.query;
    }
  }

  return {
    query: '',
    language: userQueryLanguage || settings.get(SEARCH_QUERY_LANGUAGE_SETTINGS),
  };
}

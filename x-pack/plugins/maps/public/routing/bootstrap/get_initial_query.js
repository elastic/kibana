/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUiSettings } from '../../kibana_services';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/public';

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
    language: userQueryLanguage || settings.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE),
  };
}

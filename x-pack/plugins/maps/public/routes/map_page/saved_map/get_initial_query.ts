/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getData } from '../../../kibana_services';
import { MapsAppState } from '../url_state';
import { SerializedMapState } from './types';

export function getInitialQuery({
  serializedMapState,
  appState = {},
}: {
  serializedMapState?: SerializedMapState;
  appState: MapsAppState;
}) {
  if (appState.query) {
    return appState.query;
  }

  if (serializedMapState?.query) {
    return serializedMapState.query;
  }

  return getData().query.queryString.getDefaultQuery();
}

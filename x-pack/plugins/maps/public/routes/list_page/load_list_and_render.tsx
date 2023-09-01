/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { ScopedHistory } from '@kbn/core/public';
import { MapsListView } from './maps_list_view';
import { APP_ID } from '../../../common/constants';
import { getMapClient } from '../../content_management';

interface Props {
  history: ScopedHistory;
  stateTransfer: EmbeddableStateTransfer;
}

export function LoadListAndRender(props: Props) {
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [hasSavedMaps, setHasSavedMaps] = useState(true);

  useEffect(() => {
    props.stateTransfer.clearEditorState(APP_ID);

    let ignore = false;
    getMapClient()
      .search({ limit: 1 })
      .then((results) => {
        if (!ignore) {
          setHasSavedMaps(results.hits.length > 0);
          setMapsLoaded(true);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setMapsLoaded(true);
          setHasSavedMaps(false);
        }
      });
    return () => {
      ignore = true;
    };
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mapsLoaded) {
    // do not render loading state to avoid UI flash when listing page is displayed
    return null;
  }

  return hasSavedMaps ? <MapsListView history={props.history} /> : <Redirect to="/map" />;
}

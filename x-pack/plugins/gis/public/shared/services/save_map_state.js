/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getStore, gisStateSync } from '../../store/store';

const getCurrentMapState = (() => {
  const customReplacer = (key, value) => {
    if (typeof value === 'number') {
      return value.toString();
    }
    return value;
  };
  return async () => {
    const store = await getStore();
    const { map } = store.getState();
    const stringMap = JSON.stringify(map, customReplacer);
    return (stringMap);
  };
})();

export const saveMapSettings = async gisWorkspace => {
  const currentMapState = await getCurrentMapState();
  return ({ newTitle }) => {
    const savedObjectId = gisStateSync.get('workspaceId');
    const newState = { mapState: currentMapState, title: newTitle };
    if (savedObjectId) {
      return gisWorkspace.update(savedObjectId, newState);
    } else {
      return gisWorkspace.save(newState)
        .then(({ id }) => {
          if (id) gisStateSync.set('workspaceId', id);
          return { id };
        });
    }
  };
};
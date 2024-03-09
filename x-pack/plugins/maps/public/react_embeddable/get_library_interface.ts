/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getCore } from '../kibana_services';
import { SavedMap } from '../routes/map_page';

export function getLibraryInterface(savedMap: SavedMap) {
  return {
    canLinkToLibrary: async () => {
      const { maps } = getCore().application.capabilities;
      return maps.save && savedMap.getSavedObjectId() === undefined;
    },
    linkToLibrary: async () => {},
    canUnlinkFromLibrary: async () => {
      return savedMap.getSavedObjectId() !== undefined;
    },
    unlinkFromLibrary: async () => {},
  };
}
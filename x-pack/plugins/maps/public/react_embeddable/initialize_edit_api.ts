/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFullPath, MAP_EMBEDDABLE_NAME } from '../../common/constants';
import { getHttp, getMapsCapabilities } from '../kibana_services';

export function initializeEditApi(savedObjectId?: string) {
  return {
    getTypeDisplayName: () => {
      return MAP_EMBEDDABLE_NAME;
    },
    onEdit: () => {},
    isEditingEnabled: () => {
      return getMapsCapabilities().save as boolean;
    },
    getEditHref: () => {
      return getHttp().basePath.prepend(getFullPath(savedObjectId));
    },
  }
}
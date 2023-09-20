/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import { RawAction } from '../../../types';
import { Connector } from '../types';

export function connectorFromSavedObject(
  savedObject: SavedObject<RawAction>,
  isDeprecated: boolean
): Connector {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
    isPreconfigured: false,
    isDeprecated,
    isSystemAction: false,
  };
}

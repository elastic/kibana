/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsType } from '@kbn/core/server';
import { syntheticsParamType } from '../../../../common/types/saved_objects';

export const SYNTHETICS_SECRET_ENCRYPTED_TYPE = {
  type: syntheticsParamType,
  attributesToEncrypt: new Set(['value']),
};

export const syntheticsParamSavedObjectType: SavedObjectsType = {
  name: syntheticsParamType,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
    icon: 'uptimeApp',
  },
};

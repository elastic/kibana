/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFieldMapping, SavedObjectsType } from '@kbn/core/server';
import type { PublicFileSavedObjectAttributes } from '../../common/types';
import { PUBLIC_FILE_SO_TYPE } from '../../common/constants';

/**
 * This saved object represents an instance of a publicly shared file.
 *
 * This file should be accessible to anyone who can access this Kibana over the
 * Internet.
 */

type Properties = Record<keyof PublicFileSavedObjectAttributes, SavedObjectsFieldMapping>;

const properties: Properties = {
  created_at: {
    type: 'date',
  },
  valid_until: {
    type: 'date',
  },
  file: {
    type: 'keyword',
  },
};

export const publicFileObjectType: SavedObjectsType<PublicFileSavedObjectAttributes> = {
  name: PUBLIC_FILE_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic', // These saved objects should be visible everywhere
  mappings: {
    dynamic: false,
    properties,
  },
};

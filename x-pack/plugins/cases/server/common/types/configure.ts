/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import type { SavedObject } from '@kbn/core/server';
import type { ConfigurationAttributes } from '../../../common/api';
import {
  ConfigurationActivityFieldsRt,
  ConfigurationBasicWithoutOwnerRt,
  ConfigurationAttributesRt,
} from '../../../common/api';
import type { ConnectorPersisted } from './connectors';
import type { User } from './user';

export interface ConfigurationPersistedAttributes {
  connector: ConnectorPersisted;
  closure_type: string;
  owner: string;
  created_at: string;
  created_by: User;
  updated_at: string | null;
  updated_by: User | null;
}

export type ConfigurationTransformedAttributes = ConfigurationAttributes;
export type ConfigurationSavedObjectTransformed = SavedObject<ConfigurationTransformedAttributes>;

export const ConfigurationPartialAttributesRt = rt.intersection([
  rt.exact(rt.partial(ConfigurationBasicWithoutOwnerRt.props)),
  rt.exact(rt.partial(ConfigurationActivityFieldsRt.props)),
  rt.exact(
    rt.partial({
      owner: rt.string,
    })
  ),
]);

export const ConfigurationTransformedAttributesRt = ConfigurationAttributesRt;

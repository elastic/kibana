/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { OSQUERY_APP_LOCATOR } from '../common/constants';

export type OsqueryAppLocator = LocatorPublic<OsqueryAppLocatorParams>;

export interface OsqueryAppLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export class OsqueryAppLocatorDefinition implements LocatorDefinition<OsqueryAppLocatorParams> {
  public readonly id = OSQUERY_APP_LOCATOR;

  public readonly getLocation = async (): Promise<KibanaLocation> => ({
    app: 'osquery',
    path: '',
    state: {},
  });
}

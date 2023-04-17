/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { LOCATOR } from '../common/constants';

export interface GrokDebuggerAppLocatorParams extends SerializableRecord {} // eslint-disable-line @typescript-eslint/no-empty-interface

export type GrokDebuggerAppLocator = LocatorPublic<GrokDebuggerAppLocatorParams>;

export class GrokDebuggerAppLocatorDefinition
  implements LocatorDefinition<GrokDebuggerAppLocatorParams>
{
  public readonly id = LOCATOR.APP;

  public readonly getLocation = async (
    _params: GrokDebuggerAppLocatorParams
  ): Promise<KibanaLocation> => {
    return {
      app: 'dev_tools',
      path: '#/grokdebugger',
      state: {},
    };
  };
}

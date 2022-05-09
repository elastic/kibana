/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/server';
import { ExecutionContext } from '@kbn/expressions-plugin';
import { PluginStartContract } from '../plugin';

const getUiSettings = (coreStart: CoreStart, context: ExecutionContext) => {
  const kibanaRequest = context.getKibanaRequest?.();

  if (!kibanaRequest) {
    throw new Error('expression function cannot be executed without a KibanaRequest');
  }

  return coreStart.uiSettings.asScopedToClient(
    coreStart.savedObjects.getScopedClient(kibanaRequest)
  );
};

/** @internal **/
export const getFormatFactory =
  (core: CoreSetup<PluginStartContract>) => async (context: ExecutionContext) => {
    const [coreStart, { fieldFormats: fieldFormatsStart }] = await core.getStartServices();

    const fieldFormats = await fieldFormatsStart.fieldFormatServiceFactory(
      getUiSettings(coreStart, context)
    );

    return fieldFormats.deserialize;
  };

/** @internal **/
export const getTimeZoneFactory =
  (core: CoreSetup<PluginStartContract>) => async (context: ExecutionContext) => {
    const [coreStart] = await core.getStartServices();
    const uiSettings = await getUiSettings(coreStart, context);
    const timezone = await uiSettings.get('dateFormat:tz');

    /** if `Browser`, hardcode it to 'UTC' so the export has data that makes sense **/
    return timezone === 'Browser' ? 'UTC' : timezone;
  };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { BrowserSimpleFields, ConfigKey } from '../../../common/runtime_types';
import { inlineToProjectZip } from '../../common/inline_to_zip';

export async function mapInlineToProjectFields(
  monitorType: string,
  monitor: unknown,
  logger: Logger
): Promise<Record<string, string> | {}> {
  if (monitorType !== 'browser') return {};
  const asBrowserMonitor = monitor as BrowserSimpleFields;
  return {
    [ConfigKey.SOURCE_INLINE]: '',
    [ConfigKey.SOURCE_PROJECT_CONTENT]: !!asBrowserMonitor?.[ConfigKey.SOURCE_INLINE]
      ? await inlineToProjectZip(
          asBrowserMonitor?.[ConfigKey.SOURCE_INLINE]!,
          asBrowserMonitor?.[ConfigKey.CONFIG_ID],
          logger
        )
      : asBrowserMonitor?.[ConfigKey.SOURCE_PROJECT_CONTENT] ?? '',
  };
}

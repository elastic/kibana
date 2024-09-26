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
  logger: Logger,
  includeInlineScript = true
) {
  if (monitorType !== 'browser' || !monitor) return {};
  const asBrowserMonitor = monitor as BrowserSimpleFields;
  const inlineScript = asBrowserMonitor?.[ConfigKey.SOURCE_INLINE];
  if (!inlineScript) return {};
  try {
    const projectZip = await inlineToProjectZip(
      inlineScript,
      asBrowserMonitor?.[ConfigKey.CONFIG_ID],
      logger
    );
    if (includeInlineScript)
      return {
        [ConfigKey.SOURCE_INLINE]: inlineScript,
        [ConfigKey.SOURCE_PROJECT_CONTENT]: projectZip,
      };
    return {
      [ConfigKey.SOURCE_PROJECT_CONTENT]: projectZip,
    };
  } catch (e) {
    logger.error(e);
  }

  return {
    [ConfigKey.SOURCE_INLINE]: inlineScript,
  };
}

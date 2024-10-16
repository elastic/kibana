/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { omit } from 'lodash';
import { BrowserSimpleFields, ConfigKey, MonitorFields } from '../../../common/runtime_types';
import { inlineToProjectZip } from '../../common/inline_to_zip';

interface MapInlineToProjectFieldsArgs {
  monitorType: string;
  monitor: unknown;
  logger: Logger;
  includeInlineScript?: boolean;
}

export async function mapInlineToProjectFields({
  monitorType,
  monitor,
  logger,
  includeInlineScript,
}: MapInlineToProjectFieldsArgs) {
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

/**
 * We don't transmit the inline script in `source.inline.script` field anymore, because JS parsing on the backend
 * can break on certain characters. The procedure for handling project content (the default behavior in the absence
 * of the inline script data) is not susceptible to this issue.
 *
 * See https://github.com/elastic/kibana/issues/169963 for more information.
 */
export const dropInlineScriptForTransmission = (monitor: MonitorFields): MonitorFields => {
  if ((monitor as MonitorFields)[ConfigKey.SOURCE_PROJECT_CONTENT]) {
    return omit(monitor, ConfigKey.SOURCE_INLINE) as MonitorFields;
  }
  return monitor;
};

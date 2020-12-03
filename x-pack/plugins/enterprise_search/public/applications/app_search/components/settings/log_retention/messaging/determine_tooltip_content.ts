/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogRetentionSettings } from '../types';
import { TMessageStringOrFunction, LogRetentionMessages } from './types';

export const determineTooltipContent = (
  messages: LogRetentionMessages,
  ilmEnabled: boolean,
  logRetentionSettings?: LogRetentionSettings
) => {
  if (typeof logRetentionSettings === 'undefined') {
    return;
  }

  const renderOrReturnMessage = (message: TMessageStringOrFunction) => {
    if (typeof message === 'function') {
      return message(ilmEnabled, logRetentionSettings);
    }
    return message;
  };

  if (!logRetentionSettings.enabled) {
    return renderOrReturnMessage(messages.noLogging);
  }
  if (logRetentionSettings.enabled && !ilmEnabled) {
    return renderOrReturnMessage(messages.ilmDisabled);
  }
  if (
    logRetentionSettings.enabled &&
    ilmEnabled &&
    !logRetentionSettings.retentionPolicy?.isDefault
  ) {
    return renderOrReturnMessage(messages.customPolicy);
  }
  if (
    logRetentionSettings.enabled &&
    ilmEnabled &&
    logRetentionSettings.retentionPolicy?.isDefault
  ) {
    return renderOrReturnMessage(messages.defaultPolicy);
  }
};

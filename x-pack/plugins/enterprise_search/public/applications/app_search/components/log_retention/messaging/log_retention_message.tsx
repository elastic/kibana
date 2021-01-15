/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { AppLogic } from '../../../app_logic';
import { LogRetentionLogic } from '../log_retention_logic';
import { LogRetentionOptions } from '../types';

import { NoLogging, ILMDisabled, CustomPolicy, DefaultPolicy } from './constants';

interface Props {
  type: LogRetentionOptions;
}
export const LogRetentionMessage: React.FC<Props> = ({ type }) => {
  const { ilmEnabled } = useValues(AppLogic);

  const { logRetention } = useValues(LogRetentionLogic);
  if (!logRetention) return null;

  const logRetentionSettings = logRetention[type];
  if (!logRetentionSettings) return null;

  if (!logRetentionSettings.enabled) {
    return <NoLogging type={type} disabledAt={logRetentionSettings.disabledAt} />;
  }
  if (!ilmEnabled) {
    return <ILMDisabled type={type} />;
  }
  if (!logRetentionSettings.retentionPolicy?.isDefault) {
    return <CustomPolicy type={type} />;
  } else {
    return (
      <DefaultPolicy type={type} minAgeDays={logRetentionSettings.retentionPolicy?.minAgeDays} />
    );
  }
};

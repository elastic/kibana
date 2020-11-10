/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useValues } from 'kea';
import moment from 'moment';

import { AppLogic } from '../../../../app_logic';
import { LogRetentionLogic } from '../log_retention_logic';
import { ELogRetentionOptions } from '../types';

import { determineTooltipContent } from './determine_tooltip_content';
import { ANALYTICS_MESSAGES, API_MESSAGES } from './constants';

export const renderLogRetentionDate = (dateString: string) =>
  moment(dateString).format('MMMM D, YYYY');

export const AnalyticsLogRetentionMessage: React.FC = () => {
  const { ilmEnabled } = useValues(AppLogic);
  const { logRetention } = useValues(LogRetentionLogic);
  if (!logRetention) return null;

  return (
    <>
      {determineTooltipContent(
        ANALYTICS_MESSAGES,
        ilmEnabled,
        logRetention[ELogRetentionOptions.Analytics]
      )}
    </>
  );
};

export const ApiLogRetentionMessage: React.FC = () => {
  const { ilmEnabled } = useValues(AppLogic);
  const { logRetention } = useValues(LogRetentionLogic);
  if (!logRetention) return null;

  return (
    <>{determineTooltipContent(API_MESSAGES, ilmEnabled, logRetention[ELogRetentionOptions.API])}</>
  );
};

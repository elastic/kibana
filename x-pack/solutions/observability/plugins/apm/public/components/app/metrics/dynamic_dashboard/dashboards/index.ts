/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSdkNameAndLanguage } from '@kbn/elastic-agent-utils';
import type { LanguageDashboard } from '../types';
import { languageDashboards } from './dashboard_catalog';

export const getLanguageDashboard = (agentName?: string): LanguageDashboard | undefined => {
  if (!agentName) {
    return undefined;
  }

  const { language } = getSdkNameAndLanguage(agentName);
  if (!language) {
    return undefined;
  }

  return languageDashboards[language.toLowerCase()];
};

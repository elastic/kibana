/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { Replacements } from '@kbn/elastic-assistant-common';
import React from 'react';

import { AiInsights } from './ai_insights';
import { Alerts } from './alerts';
import * as i18n from './translations';
import type { AlertsInsight } from '../../types';

interface TabInfo {
  content: JSX.Element;
  id: string;
  name: string;
}

export const getTabs = ({
  insight,
  promptContextId,
  replacements,
  showAnonymized = false,
}: {
  insight: AlertsInsight;
  promptContextId: string | undefined;
  replacements?: Replacements;
  showAnonymized?: boolean;
}): TabInfo[] => [
  {
    id: 'aiInsights--id',
    name: i18n.AI_INSIGHTS,
    content: (
      <>
        <EuiSpacer />
        <AiInsights
          insight={insight}
          promptContextId={promptContextId}
          replacements={replacements}
          showAnonymized={showAnonymized}
        />
      </>
    ),
  },
  {
    id: 'alerts--id',
    name: i18n.ALERTS,
    content: (
      <>
        <EuiSpacer />
        <Alerts insight={insight} replacements={replacements} />
      </>
    ),
  },
];

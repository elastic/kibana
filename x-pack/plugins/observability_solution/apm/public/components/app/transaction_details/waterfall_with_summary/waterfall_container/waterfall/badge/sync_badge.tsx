/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AgentName } from '../../../../../../../../typings/es_schemas/ui/fields/agent';

export interface SyncBadgeProps {
  /**
   * Is the request synchronous? True will show blocking, false will show async.
   */
  sync?: boolean;
  agentName: AgentName;
}

const BLOCKING_LABEL = i18n.translate(
  'xpack.apm.transactionDetails.syncBadgeBlocking',
  {
    defaultMessage: 'blocking',
  }
);

const ASYNC_LABEL = i18n.translate(
  'xpack.apm.transactionDetails.syncBadgeAsync',
  {
    defaultMessage: 'async',
  }
);

// true will show blocking, false will show async.
// otel doesn't set sync field
const agentsSyncMap: Record<string, boolean> = {
  nodejs: true,
  'js-base': true,
  'rum-js': true,
  php: false,
  python: false,
  dotnet: false,
  'iOS/swift': false,
  ruby: false,
  java: false,
  go: false,
};

export function getSyncLabel(agentName: AgentName, sync?: boolean) {
  if (sync === undefined) {
    return;
  }

  const agentSyncValue = agentsSyncMap[agentName];
  if (sync && agentSyncValue) {
    return BLOCKING_LABEL;
  }

  if (!sync && !agentSyncValue) {
    return ASYNC_LABEL;
  }
}

export function SyncBadge({ sync, agentName }: SyncBadgeProps) {
  const syncLabel = getSyncLabel(agentName, sync);
  if (!syncLabel) {
    return null;
  }

  return <EuiBadge>{syncLabel}</EuiBadge>;
}

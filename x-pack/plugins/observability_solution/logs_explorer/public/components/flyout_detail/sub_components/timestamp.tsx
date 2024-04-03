/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { FlyoutDoc } from '../../../../common/document';

interface TimestampProps {
  timestamp: FlyoutDoc['@timestamp'];
}

export function Timestamp({ timestamp }: TimestampProps) {
  if (!timestamp) return null;

  return (
    <EuiBadge color="hollow" data-test-subj="logsExplorerFlyoutLogTimestamp">
      {timestamp}
    </EuiBadge>
  );
}

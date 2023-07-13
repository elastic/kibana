/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { STATE_NAMES } from './states';

export const StateBadge = ({ state }: { state: string }) => {
  switch (state) {
    case 'running':
      return <EuiBadge color="success">{STATE_NAMES.running}</EuiBadge>;
    case 'sleeping':
      return <EuiBadge color="default">{STATE_NAMES.sleeping}</EuiBadge>;
    case 'dead':
      return <EuiBadge color="danger">{STATE_NAMES.dead}</EuiBadge>;
    case 'stopped':
      return <EuiBadge color="warning">{STATE_NAMES.stopped}</EuiBadge>;
    case 'idle':
      return <EuiBadge color="primary">{STATE_NAMES.idle}</EuiBadge>;
    case 'zombie':
      return <EuiBadge color="danger">{STATE_NAMES.zombie}</EuiBadge>;
    default:
      return <EuiBadge color="hollow">{STATE_NAMES.unknown}</EuiBadge>;
  }
};

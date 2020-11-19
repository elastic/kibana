/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { RoundedBadge } from './rounded_badge';
import { RoundedBadgeAntenna } from './rounded_badge_antenna';

export type AndOr = 'and' | 'or';

/** Displays AND / OR in a round badge */
// Ref: https://github.com/elastic/eui/issues/1655
export const AndOrBadge = React.memo<{ type: AndOr; includeAntennas?: boolean }>(
  ({ type, includeAntennas = false }) => {
    return includeAntennas ? <RoundedBadgeAntenna type={type} /> : <RoundedBadge type={type} />;
  }
);

AndOrBadge.displayName = 'AndOrBadge';

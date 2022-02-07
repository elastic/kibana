/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { Score } from '../../common/types';
import * as TEXT from './translations';

interface Props {
  value: Score;
}

export const CspHealthBadge = ({ value }: Props) => {
  if (value <= 65) return <EuiBadge color="danger">{TEXT.CRITICAL}</EuiBadge>;
  if (value <= 86) return <EuiBadge color="warning">{TEXT.WARNING}</EuiBadge>;
  if (value <= 100) return <EuiBadge color="success">{TEXT.HEALTHY}</EuiBadge>;
  return null;
};

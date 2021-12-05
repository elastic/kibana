/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
// TODO: find out how to import from the server folder without warnings
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Score } from '../../../server/cloud_posture/types';

interface Props {
  value: Score;
}

export const CSPHealthBadge = ({ value }: Props) => {
  if (value <= 65) return <EuiBadge color="danger">{'Critical'}</EuiBadge>;
  if (value <= 86) return <EuiBadge color="warning">{'Warning'}</EuiBadge>;
  if (value <= 100) return <EuiBadge color="success">{'Healthy'}</EuiBadge>;
  return null;
};

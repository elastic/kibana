/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { Health } from '../../../common/types';

interface Props {
  health: Health;
}

const healthToColor = (health: Health) => {
  switch (health) {
    case 'green':
      return 'success';
    case 'yellow':
      return 'warning';
    case 'red':
      return 'danger';
  }
};

export const DataHealth: React.FunctionComponent<Props> = ({ health }) => (
  <EuiHealth color={healthToColor(health)}>{health}</EuiHealth>
);

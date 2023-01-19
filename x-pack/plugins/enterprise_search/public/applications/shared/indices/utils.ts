/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

import { IconColor } from '@elastic/eui';

export const indexHealthToHealthColor = (health?: HealthStatus | 'unavailable'): IconColor => {
  switch (health) {
    case 'green':
      return 'success';
    case 'red':
      return 'danger';
    case 'unavailable':
      return '';
    case 'yellow':
      return 'warning';
    default:
      return '';
  }
};

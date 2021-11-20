/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSeverity } from '../../../common/enums';
import { sortByNewestAlert } from './sort_by_newest_alert';

describe('sortByNewestAlert', () => {
  const ui = {
    isFiring: false,
    severity: AlertSeverity.Danger,
    message: { text: '' },
    resolvedMS: 0,
    lastCheckedMS: 0,
    triggeredMS: 0,
  };

  const cluster = { clusterUuid: '1', clusterName: 'one' };

  it('should sort properly', () => {
    const a = {
      firing: false,
      meta: {},
      state: {
        cluster,
        ui: {
          ...ui,
          triggeredMS: 2,
        },
        nodeId: `es1`,
        nodeName: `es_name_1`,
      },
    };
    const b = {
      firing: false,
      meta: {},
      state: {
        cluster,
        ui: {
          ...ui,
          triggeredMS: 1,
        },
        nodeId: `es1`,
        nodeName: `es_name_1`,
      },
    };
    expect(sortByNewestAlert(a, b)).toBe(-1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsOptions } from '../../../types';

export const buildAlertsOptionsFilters = ({
  showBuildingBlockAlerts = false,
  showOnlyThreatIndicatorAlerts = false,
  status,
}: AlertsOptions) => [
  ...(status
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'kibana.alert.workflow_status',
            params: {
              query: status,
            },
          },
          query: {
            match_phrase: {
              'kibana.alert.workflow_status': status,
            },
          },
        },
      ]
    : []),
  ...(showOnlyThreatIndicatorAlerts
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'kibana.alert.rule.type',
            params: {
              query: 'threat_match',
            },
          },
          query: {
            match_phrase: {
              'kibana.alert.rule.type': 'threat_match',
            },
          },
        },
      ]
    : []),
  ...(!showBuildingBlockAlerts
    ? [
        {
          meta: {
            index: '.alerts-security.alerts-id',
            alias: null,
            negate: true,
            disabled: false,
            type: 'exists',
            key: 'kibana.alert.building_block_type',
          },
          query: {
            exists: {
              field: 'kibana.alert.building_block_type',
            },
          },
        },
      ]
    : []),
];

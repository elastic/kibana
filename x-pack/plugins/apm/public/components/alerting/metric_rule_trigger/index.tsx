/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeEditor } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';

interface Props {
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  alertParams: Record<string, any>;
  defaults: Record<string, any>;
  fields: React.ReactNode[];
  chartPreview?: React.ReactNode;
}

export function MetricRuleTrigger(props: Props) {
  const { setAlertParams, alertParams } = props;

  const defaults: Record<string, any> = {
    query_delay: '5s',
    step: '1m',
    passes: `[{
        "index": [
          "traces-apm*",
          "apm-*"
        ],
        "filter": "processor.event:transaction and not (event.outcome:failure)",
        "metrics": {
          "latency_target_5m": {
            "count_over_time": {
              "range": "5m"
            },
            "filter": "transaction.duration.us<100000"
          },
          "total_requests_5m": {
            "count_over_time": {
              "range": "5m"
            }
          },
          "latency_target_1h": {
            "count_over_time": {
              "range": "1h"
            },
            "filter": "transaction.duration.us<100000"
          },
          "total_requests_1h": {
            "count_over_time": {
              "range": "1h"
            }
          },
          "latency_budget_burn_5m": {
            "expression": "1 - (latency_target_5m / total_requests_5m)"
          },
          "latency_budget_burn_1h": {
            "expression": "1 - (latency_target_1h / total_requests_1h)"
          }
        }
      }]`,
    groups: {
      sources: {
        'service.name': { field: 'service.name' },
        'service.environment': { field: 'service.environment', missing: true },
      },
    },
    ...alertParams,
  };

  useEffect(() => {
    // we only want to run this on mount to set default values
    Object.keys(defaults).forEach((key) => {
      setAlertParams(key, defaults[key]);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiCodeEditor
        value={alertParams?.passes ?? ''}
        onChange={(value) => {
          setAlertParams('passes', value);
        }}
      />
      <EuiSpacer size="m" />
    </>
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default MetricRuleTrigger;

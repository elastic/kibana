/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ApmMetrics } from '../apm_metrics';

const title = i18n.translate('xpack.monitoring.apm.instance.panels.title', {
  defaultMessage: 'APM Server - Metrics',
});

export function ApmServerInstance(props) {
  const { metrics } = props;
  const seriesToShow = [
    metrics.apm_requests,
    metrics.apm_responses_valid,
    metrics.apm_responses_errors,
    metrics.apm_acm_request_count,
    metrics.apm_acm_response,
    metrics.apm_acm_response_errors,
    metrics.apm_output_events_rate_success,
    metrics.apm_output_events_rate_failure,
    metrics.apm_transformations,
  ];

  const stats = props.summary;
  const metricProps = { ...props, title, seriesToShow, stats };
  return <ApmMetrics {...metricProps} />;
}

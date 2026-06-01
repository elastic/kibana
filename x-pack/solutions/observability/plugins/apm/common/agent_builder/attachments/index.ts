/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  SERVICE_MAP_ATTACHMENT_TYPE,
  serviceMapAttachmentDataSchema,
  type ServiceMapAttachmentData,
} from './service_map';

export {
  APM_METRICS_ATTACHMENT_TYPE,
  apmMetricsAttachmentDataSchema,
  type ApmMetricsAttachmentData,
} from './apm_metrics';

export {
  APM_TIMESERIES_ATTACHMENT_TYPE,
  apmTimeseriesAttachmentDataSchema,
  type ApmTimeseriesAttachmentData,
} from './apm_timeseries';

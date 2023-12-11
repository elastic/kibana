/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MONITOR_DURATION_US = 'monitor.duration.us';
export const SYNTHETICS_CLS = 'browser.experience.cls';
export const SYNTHETICS_LCP = 'browser.experience.lcp.us';
export const SYNTHETICS_FCP = 'browser.experience.fcp.us';
export const SYNTHETICS_DOCUMENT_ONLOAD = 'browser.experience.load.us';
export const SYNTHETICS_DCL = 'browser.experience.dcl.us';
export const SYNTHETICS_STEP_NAME = 'synthetics.step.name.keyword';
export const SYNTHETICS_STEP_DURATION = 'synthetics.step.duration.us';

export const SYNTHETICS_DNS_TIMINGS = 'synthetics.payload.timings.dns';
export const SYNTHETICS_SSL_TIMINGS = 'synthetics.payload.timings.ssl';
export const SYNTHETICS_BLOCKED_TIMINGS = 'synthetics.payload.timings.blocked';
export const SYNTHETICS_CONNECT_TIMINGS = 'synthetics.payload.timings.connect';
export const SYNTHETICS_RECEIVE_TIMINGS = 'synthetics.payload.timings.receive';
export const SYNTHETICS_SEND_TIMINGS = 'synthetics.payload.timings.send';
export const SYNTHETICS_WAIT_TIMINGS = 'synthetics.payload.timings.wait';
export const SYNTHETICS_TOTAL_TIMINGS = 'synthetics.payload.timings.total';

export const NETWORK_TIMINGS_FIELDS = [
  SYNTHETICS_DNS_TIMINGS,
  SYNTHETICS_SSL_TIMINGS,
  SYNTHETICS_BLOCKED_TIMINGS,
  SYNTHETICS_CONNECT_TIMINGS,
  SYNTHETICS_RECEIVE_TIMINGS,
  SYNTHETICS_SEND_TIMINGS,
  SYNTHETICS_WAIT_TIMINGS,
  SYNTHETICS_TOTAL_TIMINGS,
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { termQuery } from '@kbn/observability-plugin/server';
// import { SERVICE_NAME } from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getAndroidCrashDeobfuscated({
  apmEventClient,
  serviceName,
  buildId,
  stacktrace,
}: {
  apmEventClient: APMEventClient;
  serviceName: string;
  buildId: string;
  stacktrace: string[];
}) {
  // return await apmEventClient.search('get_android_crash_deobfuscated', {
  //   apm: {
  //     sources: [
  //       {
  //         documentType: ApmDocumentType.ErrorEvent,
  //         rollupInterval: RollupInterval.None,
  //       },
  //     ],
  //   },
  //   track_total_hits: false,
  //   size: 0,
  //   query: {
  //     bool: {
  //       filter: [...termQuery(SERVICE_NAME, serviceName), ...termQuery('buildId', buildId)],
  //     },
  //   },
  // });
  return '';
}

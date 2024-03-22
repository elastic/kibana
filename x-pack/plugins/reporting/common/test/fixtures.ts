/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JOB_STATUS } from '@kbn/reporting-common';
import { ReportApiJSON } from '@kbn/reporting-common/types';
import { TaskPayloadPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import type { ReportMock } from './types';

const buildMockReport = (baseObj: ReportMock): ReportApiJSON => ({
  index: '.reporting-2020.04.12',
  migration_version: '7.15.0',
  max_attempts: 1,
  timeout: 300000,
  created_by: 'elastic',
  kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d',
  kibana_name: 'spicy.local',
  ...baseObj,
  payload: {
    browserTimezone: 'America/Phoenix',
    layout: { dimensions: { height: 720, width: 1080 }, id: 'preserve_layout' },
    version: '7.14.0',
    isDeprecated: baseObj.payload.isDeprecated === true,
    ...baseObj.payload,
  } as TaskPayloadPDFV2,
});

export const mockJobs: ReportApiJSON[] = [
  buildMockReport({
    id: 'k90e51pk1ieucbae0c3t8wo2',
    attempts: 0,
    created_at: '2020-04-14T21:01:13.064Z',
    jobtype: 'printable_pdf_v2',
    meta: { layout: 'preserve_layout', objectType: 'canvas workpad' },
    payload: {
      spaceId: 'my-space',
      objectType: 'canvas workpad',
      title: 'My Canvas Workpad',
      locatorParams: [
        {
          id: 'MY_APP',
        },
      ],
    } as any,
    status: JOB_STATUS.PENDING,
  }),
  buildMockReport({
    id: 'k8t4ylcb07mi9d006214ifyg',
    attempts: 1,
    completed_at: '2020-04-09T19:10:10.049Z',
    created_at: '2020-04-09T19:09:52.139Z',
    jobtype: 'PNG',
    meta: { layout: 'png', objectType: 'visualization' },
    output: { content_type: 'image/png', size: 123456789 },
    payload: {
      objectType: 'visualization',
      title: 'count',
      isDeprecated: true,
    },
    started_at: '2020-04-09T19:09:54.570Z',
    status: JOB_STATUS.COMPLETED,
  }),
];

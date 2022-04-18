/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPromiseFromStreams } from '@kbn/utils';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';

import { FrameworkRequest } from '../../../../framework';
import {
  createMockConfig,
  requestContextMock,
  mockGetCurrentUser,
} from '../../../../detection_engine/routes/__mocks__';
import {
  addPrepackagedRulesRequest,
  getFindResultWithSingleHit,
} from '../../../../detection_engine/routes/__mocks__/request_responses';

import * as helpers from './helpers';
import { importTimelines } from '../../timelines/import_timelines/helpers';
import { buildFrameworkRequest } from '../../../utils/common';
import { ImportTimelineResultSchema } from '../../../../../../common/types/timeline';

jest.mock('../../timelines/import_timelines/helpers');

describe('installPrepackagedTimelines', () => {
  let securitySetup: SecurityPluginSetup;
  let frameworkRequest: FrameworkRequest;
  const spyInstallPrepackagedTimelines = jest.spyOn(helpers, 'installPrepackagedTimelines');

  const { clients, context } = requestContextMock.createTools();
  const config = createMockConfig();
  const mockFilePath = '../../../__mocks__';
  const mockFileName = 'prepackaged_timelines.ndjson';

  beforeEach(async () => {
    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    jest.doMock('./helpers', () => {
      return {
        ...helpers,
        installPrepackagedTimelines: spyInstallPrepackagedTimelines,
      };
    });

    const request = addPrepackagedRulesRequest();
    frameworkRequest = await buildFrameworkRequest(context, securitySetup, request);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('should call importTimelines', async () => {
    await helpers.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      false,
      mockFilePath,
      mockFileName
    );

    expect(importTimelines).toHaveBeenCalled();
  });

  test('should call importTimelines with Readables', async () => {
    await helpers.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      mockFilePath,
      mockFileName
    );
    const args = await createPromiseFromStreams([(importTimelines as jest.Mock).mock.calls[0][0]]);
    const expected = JSON.stringify({
      savedObjectId: 'mocked-timeline-id-1',
      version: 'WzExNzEyLDFd',
      columns: [
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'kibana.alert.rule.description',
          searchable: null,
        },
        {
          indexes: null,
          aggregatable: true,
          name: null,
          description:
            'The action captured by the event.\n\nThis describes the information in the event. It is more specific than `event.category`.\nExamples are `group-add`, `process-started`, `file-created`. The value is\nnormally defined by the implementer.',
          columnHeaderType: 'not-filtered',
          id: 'event.action',
          category: 'event',
          type: 'string',
          searchable: null,
          example: 'user-password-change',
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'endgame.data.rule_name',
          searchable: null,
        },
        {
          indexes: null,
          name: null,
          columnHeaderType: 'not-filtered',
          id: 'rule.reference',
          searchable: null,
        },
        {
          aggregatable: true,
          description:
            'Name of the host.\n\nIt can contain what `hostname` returns on Unix systems, the fully qualified\ndomain name, or a name specified by the user. The sender decides which value\nto use.',
          columnHeaderType: 'not-filtered',
          id: 'host.name',
          category: 'host',
          type: 'string',
        },
        {
          aggregatable: true,
          description: 'Operating system name, without the version.',
          columnHeaderType: 'not-filtered',
          id: 'host.os.name',
          category: 'host',
          type: 'string',
          example: 'Mac OS X',
        },
      ],
      dataProviders: [
        {
          excluded: false,
          and: [],
          kqlQuery: '',
          name: '3c322ed995865f642c1a269d54cbd177bd4b0e6efcf15a589f4f8582efbe7509',
          queryMatch: {
            displayValue: null,
            field: '_id',
            displayField: null,
            value: '3c322ed995865f642c1a269d54cbd177bd4b0e6efcf15a589f4f8582efbe7509',
            operator: ':',
          },
          id: 'send-signal-to-timeline-action-default-draggable-event-details-value-formatted-field-value-timeline-1-signal-id-3c322ed995865f642c1a269d54cbd177bd4b0e6efcf15a589f4f8582efbe7509',
          enabled: true,
        },
      ],
      description: '',
      eventType: 'all',
      filters: [],
      kqlMode: 'filter',
      kqlQuery: { filterQuery: { kuery: { kind: 'kuery', expression: '' }, serializedQuery: '' } },
      title: 'Generic Endpoint Timeline',
      dateRange: { start: 1588257731065, end: 1588258391065 },
      savedQueryId: null,
      sort: { columnId: '@timestamp', sortDirection: 'desc' },
      created: 1588258576517,
      createdBy: 'elastic',
      updated: 1588261039030,
      updatedBy: 'elastic',
      eventNotes: [],
      globalNotes: [],
      pinnedEventIds: [],
      timelineType: 'template',
    });
    expect(args).toEqual(expected);
  });

  test('should call importTimelines with maxTimelineImportExportSize', async () => {
    await helpers.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      mockFilePath,
      mockFileName
    );

    expect((importTimelines as jest.Mock).mock.calls[0][1]).toEqual(
      config.maxTimelineImportExportSize
    );
  });

  test('should call importTimelines with frameworkRequest', async () => {
    await helpers.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      mockFilePath,
      mockFileName
    );

    expect(JSON.stringify((importTimelines as jest.Mock).mock.calls[0][2])).toEqual(
      JSON.stringify(frameworkRequest)
    );
  });

  test('should call importTimelines with immutable', async () => {
    await helpers.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      mockFilePath,
      mockFileName
    );

    expect((importTimelines as jest.Mock).mock.calls[0][3]).toEqual(true);
  });

  test('should handle errors from getReadables', async () => {
    const result = await helpers.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      mockFilePath,
      'prepackaged_timeline.ndjson'
    );

    expect(
      (result as ImportTimelineResultSchema).errors[0].error.message.includes(
        'read prepackaged timelines error:'
      )
    ).toBeTruthy();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { join, resolve } from 'path';

import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils/streams';
import { SecurityPluginSetup } from '../../../../../../security/server';

import { FrameworkRequest } from '../../../framework';
import {
  createMockConfig,
  requestContextMock,
  mockGetCurrentUser,
} from '../../../detection_engine/routes/__mocks__';
import {
  addPrepackagedRulesRequest,
  getNonEmptyIndex,
  getFindResultWithSingleHit,
} from '../../../detection_engine/routes/__mocks__/request_responses';

import * as lib from './install_prepacked_timelines';
import { importTimelines } from './import_timelines';
import { buildFrameworkRequest } from './common';
import { ImportTimelineResultSchema } from '../../../../../common/types/timeline';

jest.mock('./import_timelines');

describe('installPrepackagedTimelines', () => {
  let securitySetup: SecurityPluginSetup;
  let frameworkRequest: FrameworkRequest;
  const spyInstallPrepackagedTimelines = jest.spyOn(lib, 'installPrepackagedTimelines');

  const { clients, context } = requestContextMock.createTools();
  const config = createMockConfig();
  const mockFilePath = '../__mocks__';
  const mockFileName = 'prepackaged_timelines.ndjson';

  beforeEach(async () => {
    securitySetup = ({
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown) as SecurityPluginSetup;

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getNonEmptyIndex());
    clients.alertsClient.find.mockResolvedValue(getFindResultWithSingleHit());

    jest.doMock('./install_prepacked_timelines', () => {
      return {
        ...lib,
        installPrepackagedTimelines: spyInstallPrepackagedTimelines,
      };
    });

    const request = addPrepackagedRulesRequest();
    frameworkRequest = await buildFrameworkRequest(context, securitySetup, request);
  });

  afterEach(() => {
    spyInstallPrepackagedTimelines.mockClear();
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('should call importTimelines', async () => {
    await lib.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      mockFilePath,
      mockFileName
    );

    expect(importTimelines).toHaveBeenCalled();
  });

  test('should call importTimelines with Readables', async () => {
    const dir = resolve(join(__dirname, mockFilePath));
    const file = mockFileName;
    await lib.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      dir,
      file
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
          id: 'signal.rule.description',
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
          id:
            'send-signal-to-timeline-action-default-draggable-event-details-value-formatted-field-value-timeline-1-signal-id-3c322ed995865f642c1a269d54cbd177bd4b0e6efcf15a589f4f8582efbe7509',
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
    const dir = resolve(join(__dirname, mockFilePath));
    const file = mockFileName;
    await lib.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      dir,
      file
    );

    expect((importTimelines as jest.Mock).mock.calls[0][1]).toEqual(
      config.maxTimelineImportExportSize
    );
  });

  test('should call importTimelines with frameworkRequest', async () => {
    const dir = resolve(join(__dirname, mockFilePath));
    const file = mockFileName;
    await lib.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      dir,
      file
    );

    expect(JSON.stringify((importTimelines as jest.Mock).mock.calls[0][2])).toEqual(
      JSON.stringify(frameworkRequest)
    );
  });

  test('should call importTimelines with immutable', async () => {
    const dir = resolve(join(__dirname, mockFilePath));
    const file = mockFileName;
    await lib.installPrepackagedTimelines(
      config.maxTimelineImportExportSize,
      frameworkRequest,
      true,
      dir,
      file
    );

    expect((importTimelines as jest.Mock).mock.calls[0][3]).toEqual(true);
  });

  test('should handle errors from getReadables', async () => {
    const result = await lib.installPrepackagedTimelines(
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

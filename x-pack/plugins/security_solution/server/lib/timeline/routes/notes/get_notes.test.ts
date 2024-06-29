/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import {
  serverMock,
  requestContextMock,
  createMockConfig,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { NOTE_URL } from '../../../../../common/constants';
import type { getNotesPaginated } from '../../utils/common';
import { mockGetCurrentUser } from '../../__mocks__/import_timelines';

const getAllNotesRequest = (query?: typeof getNotesPaginated) =>
  requestMock.create({
    method: 'get',
    path: NOTE_URL,
    query,
  });

const createMockedNotes = (numberOfNotes: number) => {
  return Array.from({ length: numberOfNotes }, (_, index) => {
    return {
      id: index + 1,
      timelineId: 'timeline',
      eventId: 'event',
      note: `test note ${index}`,
      created: 1280120812453,
      createdBy: 'test',
      updated: 108712801280,
      updatedBy: 'test',
    };
  });
};

describe('get notes route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetAllSavedNote: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    mockGetAllSavedNote = jest.fn();
    jest.doMock('../../saved_object/notes', () => ({
      getAllSavedNote: mockGetAllSavedNote,
    }));
    const getNotesRoute = jest.requireActual('.').getNotesRoute;
    getNotesRoute(server.router, createMockConfig(), securitySetup);
  });

  test('should return a list of notes and the count by default', async () => {
    mockGetAllSavedNote.mockResolvedValue({
      notes: createMockedNotes(5),
      totalCount: 5,
    });

    const response = await server.inject(
      getAllNotesRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      totalCount: 5,
      notes: createMockedNotes(5),
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PersistNoteRouteResponse } from '../../../common/api/timeline';
import { KibanaServices } from '../../common/lib/kibana';
import * as api from './api';

jest.mock('../../common/lib/kibana', () => {
  return {
    KibanaServices: {
      get: jest.fn(),
    },
  };
});

describe('Notes API client', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });
  describe('create note', () => {
    it('should throw an error when a response code other than 200 is returned', async () => {
      const errorResponse: PersistNoteRouteResponse = {
        data: {
          persistNote: {
            code: 500,
            message: 'Internal server error',
            note: {
              timelineId: '1',
              noteId: '2',
              version: '3',
            },
          },
        },
      };
      (KibanaServices.get as jest.Mock).mockReturnValue({
        http: {
          patch: jest.fn().mockReturnValue(errorResponse),
        },
      });

      expect(async () =>
        api.createNote({
          note: {
            timelineId: '1',
          },
        })
      ).rejects.toThrow();
    });
  });
});

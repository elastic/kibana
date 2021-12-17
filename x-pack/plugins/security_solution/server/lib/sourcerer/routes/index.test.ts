/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSourcererDataViewRoute, getSourcererDataViewRoute } from './';
import {
  requestMock,
  serverMock,
  requestContextMock,
} from '../../detection_engine/routes/__mocks__';

import { SOURCERER_API_URL } from '../../../../common/constants';
import { StartServicesAccessor } from 'kibana/server';
import { SetupPlugins, StartPlugins } from '../../../plugin';

jest.mock('./helpers', () => {
  const original = jest.requireActual('./helpers');

  return {
    ...original,
    findExistingIndices: () => new Promise((resolve) => resolve([true, true])),
  };
});
const mockPattern = {
  id: 'security-solution',
  title:
    'apm-*-transaction*,traces-apm*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*,ml_host_risk_score_*,.siem-signals-default',
};
const mockPatternList = [
  'apm-*-transaction*',
  'traces-apm*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
  'ml_host_risk_score_*',
  '.siem-signals-default',
];
const mockDataViews = [
  {
    id: 'metrics-*',
    title: 'metrics-*',
  },
  {
    id: 'logs-*',
    title: 'logs-*',
  },
  mockPattern,
];
const getStartServices = jest.fn().mockReturnValue([
  null,
  {
    data: {
      indexPatterns: {
        dataViewsServiceFactory: () => ({
          getIdsWithTitle: () => new Promise((rs) => rs(mockDataViews)),
          get: () => new Promise((rs) => rs(mockPattern)),
          createAndSave: () => new Promise((rs) => rs(mockPattern)),
          updateSavedObject: () => new Promise((rs) => rs(mockPattern)),
        }),
      },
    },
  },
] as unknown) as StartServicesAccessor<StartPlugins>;

const getStartServicesReject = jest.fn().mockReturnValue([
  null,
  {
    data: {
      indexPatterns: {
        dataViewsServiceFactory: () => ({
          getIdsWithTitle: () => new Promise((rs) => rs(mockDataViews)),
          get: () => new Promise((rs) => rs(mockPattern)),
          createAndSave: () => new Promise((rs, rj) => rj(new Error('error'))),
          updateSavedObject: () => new Promise((rs, rj) => rj(new Error('error'))),
        }),
      },
    },
  },
] as unknown) as StartServicesAccessor<StartPlugins>;

const getStartServicesNotSiem = jest.fn().mockReturnValue([
  null,
  {
    data: {
      indexPatterns: {
        dataViewsServiceFactory: () => ({
          getIdsWithTitle: () =>
            new Promise((rs) => rs(mockDataViews.filter((v) => v.id !== mockPattern.id))),
          get: (id: string) =>
            new Promise((rs) =>
              id === mockPattern.id
                ? rs(null)
                : rs({
                    id: 'dataview-lambda',
                    title: 'fun-*,dog-*,cat-*',
                  })
            ),
          createAndSave: () => new Promise((rs) => rs(mockPattern)),
          updateSavedObject: () => new Promise((rs) => rs(mockPattern)),
        }),
      },
    },
  },
] as unknown) as StartServicesAccessor<StartPlugins>;

const getStartServicesRejectNotSiem = jest.fn().mockReturnValue([
  null,
  {
    data: {
      indexPatterns: {
        dataViewsServiceFactory: () => ({
          getIdsWithTitle: () =>
            new Promise((rs) => rs(mockDataViews.filter((v) => v.id !== mockPattern.id))),
          get: (id: string) =>
            new Promise((rs) =>
              id === mockPattern.id
                ? rs(null)
                : rs({
                    id: 'dataview-lambda',
                    title: 'fun-*,dog-*,cat-*',
                  })
            ),
          createAndSave: () => new Promise((rs, rj) => rj(new Error('error'))),
          updateSavedObject: () => new Promise((rs, rj) => rj(new Error('error'))),
        }),
      },
    },
  },
] as unknown) as StartServicesAccessor<StartPlugins>;

const mockDataViewsTransformed = {
  defaultDataView: {
    id: 'security-solution',
    patternList: ['apm-*-transaction*', 'traces-apm*'],
    title:
      'apm-*-transaction*,traces-apm*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*,ml_host_risk_score_*,.siem-signals-default',
  },
  kibanaDataViews: [
    {
      id: 'metrics-*',
      title: 'metrics-*',
    },
    {
      id: 'logs-*',
      title: 'logs-*',
    },
    {
      id: 'security-solution',
      patternList: ['apm-*-transaction*', 'traces-apm*'],
      title:
        'apm-*-transaction*,traces-apm*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*,ml_host_risk_score_*,.siem-signals-default',
    },
  ],
};

describe('sourcerer route', () => {
  const mockAuditLogger = jest.fn();
  const security = {
    audit: {
      asSystem: () => ({
        log: mockAuditLogger,
      }),
    },
  } as unknown as SetupPlugins['security'];
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  describe('post', () => {
    const getSourcererRequest = (patternList: string[]) =>
      requestMock.create({
        method: 'post',
        path: SOURCERER_API_URL,
        body: { patternList },
      });

    describe('functional tests', () => {
      beforeEach(() => {
        server = serverMock.create();
        ({ context } = requestContextMock.createTools());
      });
      test('returns sourcerer formatted Data Views when SIEM Data View does NOT exist', async () => {
        createSourcererDataViewRoute(server.router, getStartServicesNotSiem, security);
        const response = await server.inject(getSourcererRequest(mockPatternList), context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual(mockDataViewsTransformed);
      });

      test('returns sourcerer formatted Data Views when SIEM Data View exists', async () => {
        createSourcererDataViewRoute(server.router, getStartServices, security);
        const response = await server.inject(getSourcererRequest(mockPatternList), context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual(mockDataViewsTransformed);
      });

      test('returns sourcerer formatted Data Views when SIEM Data View exists and patternList input is changed', async () => {
        createSourcererDataViewRoute(server.router, getStartServices, security);
        mockPatternList.shift();
        const response = await server.inject(getSourcererRequest(mockPatternList), context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          defaultDataView: {
            id: 'security-solution',
            patternList: ['.siem-signals-default', 'auditbeat-*'],
            title:
              '.siem-signals-default,auditbeat-*,endgame-*,filebeat-*,logs-*,ml_host_risk_score_*,packetbeat-*,traces-apm*,winlogbeat-*',
          },
          kibanaDataViews: [
            mockDataViewsTransformed.kibanaDataViews[0],
            mockDataViewsTransformed.kibanaDataViews[1],
            {
              id: 'security-solution',
              patternList: ['.siem-signals-default', 'auditbeat-*'],
              title:
                '.siem-signals-default,auditbeat-*,endgame-*,filebeat-*,logs-*,ml_host_risk_score_*,packetbeat-*,traces-apm*,winlogbeat-*',
            },
          ],
        });
      });
    });
    describe('audit log', () => {
      beforeEach(() => {
        mockAuditLogger.mockReset();
        server = serverMock.create();
        ({ context } = requestContextMock.createTools());
      });
      test('should create an audit log of creating the security solution data view', async () => {
        createSourcererDataViewRoute(server.router, getStartServicesNotSiem, security);
        await server.inject(getSourcererRequest(mockPatternList), context);
        expect(mockAuditLogger).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: 'saved_object_create',
            category: ['database'],
            outcome: 'unknown',
            type: ['creation'],
          },
          kibana: { saved_object: { id: 'security-solution', type: 'index-pattern' } },
          message: 'Kibana is creating index-pattern [id=security-solution]',
        });
      });

      test('should create an error audit log when failing to create the security solution data view', async () => {
        createSourcererDataViewRoute(server.router, getStartServicesRejectNotSiem, security);
        await server.inject(getSourcererRequest(mockPatternList), context);
        expect(mockAuditLogger).toHaveBeenLastCalledWith({
          error: {
            code: 'Error',
            message: 'error',
          },
          event: {
            action: 'saved_object_create',
            category: ['database'],
            outcome: 'failure',
            type: ['creation'],
          },
          kibana: { saved_object: { id: 'security-solution', type: 'index-pattern' } },
          message: 'Failed attempt to create index-pattern [id=security-solution]',
        });
      });

      test('should create an audit log of getting the security solution data view', async () => {
        createSourcererDataViewRoute(server.router, getStartServices, security);
        await server.inject(getSourcererRequest(mockPatternList), context);
        expect(mockAuditLogger).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: 'saved_object_get',
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            saved_object: {
              id: 'security-solution',
              type: 'index-pattern',
            },
          },
          message: 'Kibana has accessed index-pattern [id=security-solution]',
        });
      });

      test('should create an audit log of updating the security solution data view', async () => {
        createSourcererDataViewRoute(server.router, getStartServices, security);
        mockPatternList.shift();
        await server.inject(getSourcererRequest(mockPatternList), context);
        expect(mockAuditLogger).toHaveBeenNthCalledWith(2, {
          error: undefined,
          event: {
            action: 'saved_object_update',
            category: ['database'],
            outcome: 'unknown',
            type: ['change'],
          },
          kibana: { saved_object: { id: 'security-solution', type: 'index-pattern' } },
          message: 'Kibana is updating index-pattern [id=security-solution]',
        });
      });

      test('should create an error audit log when failing to update the security solution data view', async () => {
        createSourcererDataViewRoute(server.router, getStartServicesReject, security);
        mockPatternList.shift();
        await server.inject(getSourcererRequest(mockPatternList), context);
        expect(mockAuditLogger).toHaveBeenLastCalledWith({
          error: {
            code: 'Error',
            message: 'error',
          },
          event: {
            action: 'saved_object_update',
            category: ['database'],
            outcome: 'failure',
            type: ['change'],
          },
          kibana: { saved_object: { id: 'security-solution', type: 'index-pattern' } },
          message: 'Failed attempt to update index-pattern [id=security-solution]',
        });
      });
    });
  });

  describe('get', () => {
    const getSourcererRequest = (dataViewId: string) =>
      requestMock.create({
        method: 'get',
        path: SOURCERER_API_URL,
        query: { dataViewId },
      });

    describe('audit log', () => {
      beforeEach(() => {
        mockAuditLogger.mockReset();
        server = serverMock.create();
        ({ context } = requestContextMock.createTools());
      });
      test('should create an audit log of getting the security solution data view', async () => {
        getSourcererDataViewRoute(server.router, getStartServices, security);
        await server.inject(getSourcererRequest('security-solution'), context);
        expect(mockAuditLogger).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: 'saved_object_get',
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: { saved_object: { id: 'security-solution', type: 'index-pattern' } },
          message: 'Kibana has accessed index-pattern [id=security-solution]',
        });
      });

      test('should NOT create an audit log if not asking for the security solution data view', async () => {
        getSourcererDataViewRoute(server.router, getStartServicesNotSiem, security);
        await server.inject(getSourcererRequest('dataview-lambda'), context);
        expect(mockAuditLogger).toHaveBeenCalledTimes(0);
      });
    });
  });
});

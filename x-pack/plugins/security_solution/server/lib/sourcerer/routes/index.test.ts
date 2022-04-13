/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSourcererDataViewRoute } from './';
import {
  requestMock,
  serverMock,
  requestContextMock,
} from '../../detection_engine/routes/__mocks__';

import { SOURCERER_API_URL } from '../../../../common/constants';
import { StartServicesAccessor } from 'kibana/server';
import { StartPlugins } from '../../../plugin';

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
        createSourcererDataViewRoute(server.router, getStartServicesNotSiem);
        const response = await server.inject(getSourcererRequest(mockPatternList), context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual(mockDataViewsTransformed);
      });

      test('returns sourcerer formatted Data Views when SIEM Data View does NOT exist but has been created in the mean time', async () => {
        const getMock = jest.fn();
        getMock.mockResolvedValueOnce(null);
        getMock.mockResolvedValueOnce(mockPattern);
        const getStartServicesSpecial = jest.fn().mockResolvedValue([
          null,
          {
            data: {
              indexPatterns: {
                dataViewsServiceFactory: () => ({
                  getIdsWithTitle: () =>
                    new Promise((rs) => rs(mockDataViews.filter((v) => v.id !== mockPattern.id))),
                  get: getMock,
                  createAndSave: jest.fn().mockRejectedValue({ statusCode: 409 }),
                  updateSavedObject: () => new Promise((rs, rj) => rj(new Error('error'))),
                }),
              },
            },
          },
        ] as unknown) as StartServicesAccessor<StartPlugins>;
        createSourcererDataViewRoute(server.router, getStartServicesSpecial);
        const response = await server.inject(getSourcererRequest(mockPatternList), context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual(mockDataViewsTransformed);
      });

      test('passes override=true on create and save', async () => {
        const getMock = jest.fn();
        getMock.mockResolvedValueOnce(null);
        getMock.mockResolvedValueOnce(mockPattern);
        const mockCreateAndSave = jest.fn();
        const getStartServicesSpecial = jest.fn().mockResolvedValue([
          null,
          {
            data: {
              indexPatterns: {
                dataViewsServiceFactory: () => ({
                  getIdsWithTitle: () =>
                    new Promise((rs) => rs(mockDataViews.filter((v) => v.id !== mockPattern.id))),
                  get: getMock,
                  createAndSave: mockCreateAndSave.mockImplementation(
                    () => new Promise((rs) => rs(mockPattern))
                  ),
                  updateSavedObject: () => new Promise((rs, rj) => rj(new Error('error'))),
                }),
              },
            },
          },
        ] as unknown) as StartServicesAccessor<StartPlugins>;
        createSourcererDataViewRoute(server.router, getStartServicesSpecial);
        await server.inject(getSourcererRequest(mockPatternList), context);
        expect(mockCreateAndSave).toHaveBeenCalled();
        expect(mockCreateAndSave.mock.calls[0][1]).toEqual(true);
      });

      test('returns sourcerer formatted Data Views when SIEM Data View exists', async () => {
        createSourcererDataViewRoute(server.router, getStartServices);
        const response = await server.inject(getSourcererRequest(mockPatternList), context);
        expect(response.status).toEqual(200);
        expect(response.body).toEqual(mockDataViewsTransformed);
      });

      test('returns sourcerer formatted Data Views when SIEM Data View exists and patternList input is changed', async () => {
        createSourcererDataViewRoute(server.router, getStartServices);
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
  });
});

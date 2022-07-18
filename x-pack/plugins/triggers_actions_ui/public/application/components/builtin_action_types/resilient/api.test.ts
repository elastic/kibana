/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getIncidentTypes, getSeverity } from './api';

const incidentTypesResponse = {
  status: 'ok',
  data: [
    { id: 17, name: 'Communication error (fax; email)' },
    { id: 1001, name: 'Custom type' },
    { id: 21, name: 'Denial of Service' },
    { id: 6, name: 'Improper disposal: digital asset(s)' },
    { id: 7, name: 'Improper disposal: documents / files' },
    { id: 4, name: 'Lost documents / files / records' },
    { id: 3, name: 'Lost PC / laptop / tablet' },
    { id: 1, name: 'Lost PDA / smartphone' },
    { id: 8, name: 'Lost storage device / media' },
    { id: 19, name: 'Malware' },
    { id: 23, name: 'Not an Issue' },
    { id: 18, name: 'Other' },
    { id: 22, name: 'Phishing' },
    { id: 11, name: 'Stolen documents / files / records' },
    { id: 12, name: 'Stolen PC / laptop / tablet' },
    { id: 13, name: 'Stolen PDA / smartphone' },
    { id: 14, name: 'Stolen storage device / media' },
    { id: 20, name: 'System Intrusion' },
    { id: 16, name: 'TBD / Unknown' },
    { id: 15, name: 'Vendor / 3rd party error' },
  ],
};

const severityResponse = {
  status: 'ok',
  data: [
    { id: 4, name: 'Low' },
    { id: 5, name: 'Medium' },
    { id: 6, name: 'High' },
  ],
};

describe('Resilient API', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => jest.resetAllMocks());

  describe('getIncidentTypes', () => {
    test('should call get choices API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce({ ...incidentTypesResponse, connector_id: 'te/st' });
      const res = await getIncidentTypes({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
      });

      expect(res).toEqual({ ...incidentTypesResponse, actionId: 'te/st' });
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"incidentTypes","subActionParams":{}}}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('getSeverity', () => {
    test('should call get choices API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce({ ...severityResponse, connector_id: 'te/st' });
      const res = await getSeverity({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
      });

      expect(res).toEqual({ ...severityResponse, actionId: 'te/st' });

      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"severity","subActionParams":{}}}',
        signal: abortCtrl.signal,
      });
    });
  });
});

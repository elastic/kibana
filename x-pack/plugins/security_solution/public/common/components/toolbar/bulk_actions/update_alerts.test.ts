/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateAlertStatus } from './update_alerts';

const mockUpdateAlertStatusByIds = jest.fn().mockReturnValue(new Promise(() => {}));
const mockUpdateAlertStatusByQuery = jest.fn().mockReturnValue(new Promise(() => {}));

jest.mock('../../../../detections/containers/detection_engine/alerts/api', () => {
  return {
    updateAlertStatusByQuery: (params: unknown) => mockUpdateAlertStatusByQuery(params),
    updateAlertStatusByIds: (params: unknown) => mockUpdateAlertStatusByIds(params),
  };
});

const status = 'open';

describe('updateAlertStatus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if neither query nor signalIds are provided', () => {
    expect(() => {
      updateAlertStatus({ status });
    }).toThrowError('Either query or signalIds must be provided');
  });

  it('should call updateAlertStatusByIds if signalIds are provided', () => {
    const signalIds = ['1', '2'];
    updateAlertStatus({
      status,
      signalIds,
    });
    expect(mockUpdateAlertStatusByIds).toHaveBeenCalledWith({
      status,
      signalIds,
    });
    expect(mockUpdateAlertStatusByQuery).not.toHaveBeenCalled();
  });

  it('should call mockUpdateAlertStatusByQuery if query is provided', () => {
    const query = { query: 'query' };
    updateAlertStatus({
      status,
      query,
    });
    expect(mockUpdateAlertStatusByIds).not.toHaveBeenCalled();
    expect(mockUpdateAlertStatusByQuery).toHaveBeenCalledWith({
      status,
      query,
    });
  });
});

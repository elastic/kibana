/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAnomalies } from '../mock';
import { convertAnomaliesToUsers, getUserNameFromEntity } from './convert_anomalies_to_users';
import { AnomaliesByUser } from '../types';

describe('convert_anomalies_to_users', () => {
  test('it returns expected anomalies from a user', () => {
    const entities = convertAnomaliesToUsers(mockAnomalies);

    const expected: AnomaliesByUser[] = [
      {
        anomaly: mockAnomalies.anomalies[0],
        userName: 'root',
      },
      {
        anomaly: mockAnomalies.anomalies[1],
        userName: 'root',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns empty anomalies if sent in a null', () => {
    const entities = convertAnomaliesToUsers(null);
    const expected: AnomaliesByUser[] = [];
    expect(entities).toEqual(expected);
  });

  test('it returns a specific anomaly if sent in the user name of an anomaly', () => {
    const anomalies = {
      ...mockAnomalies,
      anomalies: [
        {
          ...mockAnomalies.anomalies[0],
          entityName: 'something-else',
          entityValue: 'something-else',
          influencers: [
            { 'host.name': 'zeek-iowa' },
            { 'process.name': 'du' },
            { 'user.name': 'something-else' },
          ],
        },
        mockAnomalies.anomalies[1],
      ],
    };

    const entities = convertAnomaliesToUsers(anomalies, 'root');
    const expected: AnomaliesByUser[] = [
      {
        anomaly: anomalies.anomalies[1],
        userName: 'root',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns a specific anomaly if an influencer has the user name', () => {
    const anomalies = {
      ...mockAnomalies,
      anomalies: [
        {
          ...mockAnomalies.anomalies[0],
          entityName: 'something-else',
          entityValue: 'something-else',
          influencers: [
            { 'host.name': 'zeek-iowa' },
            { 'process.name': 'du' },
            { 'user.name': 'something-else' },
          ],
        },
        {
          ...mockAnomalies.anomalies[1],
          entityName: 'something-else',
          entityValue: 'something-else',
        },
      ],
    };

    const entities = convertAnomaliesToUsers(anomalies, 'root');
    const expected: AnomaliesByUser[] = [
      {
        anomaly: anomalies.anomalies[1],
        userName: 'root',
      },
    ];
    expect(entities).toEqual(expected);
  });

  test('it returns empty anomalies if sent in the name of one that does not exist', () => {
    const entities = convertAnomaliesToUsers(mockAnomalies, 'some-made-up-name-here-for-you');
    const expected: AnomaliesByUser[] = [];
    expect(entities).toEqual(expected);
  });

  test('it returns true for a found entity name passed in', () => {
    const anomalies = {
      ...mockAnomalies,
      anomalies: [
        {
          ...mockAnomalies.anomalies[0],
          entityName: 'user.name',
          entityValue: 'admin',
        },
        mockAnomalies.anomalies[1],
      ],
    };

    const found = getUserNameFromEntity(anomalies.anomalies[0], 'admin');
    expect(found).toEqual(true);
  });

  test('it returns false for an entity name that does not exist', () => {
    const anomalies = {
      ...mockAnomalies,
      anomalies: [
        {
          ...mockAnomalies.anomalies[0],
          entityName: 'user.name',
          entityValue: 'admin',
        },
        mockAnomalies.anomalies[1],
      ],
    };

    const found = getUserNameFromEntity(anomalies.anomalies[0], 'some-made-up-entity-name');
    expect(found).toEqual(false);
  });

  test('it returns true for an entity that has user.name within it if no name is passed in', () => {
    const anomalies = {
      ...mockAnomalies,
      anomalies: [
        {
          ...mockAnomalies.anomalies[0],
          entityName: 'user.name',
          entityValue: 'something-made-up',
        },
        mockAnomalies.anomalies[1],
      ],
    };

    const found = getUserNameFromEntity(anomalies.anomalies[0]);
    expect(found).toEqual(true);
  });

  test('it returns false for an entity that is not user.name and no name is passed in', () => {
    const anomalies = {
      ...mockAnomalies,
      anomalies: [
        {
          ...mockAnomalies.anomalies[0],
          entityValue: 'made-up',
        },
        mockAnomalies.anomalies[1],
      ],
    };

    const found = getUserNameFromEntity(anomalies.anomalies[0]);
    expect(found).toEqual(false);
  });
});

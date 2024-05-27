/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerationInterval } from '../../types';
import {
  encodeGenerationIntervals,
  decodeGenerationIntervals,
  getLocalStorageGenerationIntervals,
  setLocalStorageGenerationIntervals,
} from '.';

const key = 'elasticAssistantDefault.attackDiscovery.default.generationIntervals';

const generationIntervals: Record<string, GenerationInterval[]> = {
  'test-connector-1': [
    {
      connectorId: 'test-connector-1',
      date: new Date('2024-05-16T14:13:09.838Z'),
      durationMs: 173648,
    },
    {
      connectorId: 'test-connector-1',
      date: new Date('2024-05-16T13:59:49.620Z'),
      durationMs: 146605,
    },
    {
      connectorId: 'test-connector-1',
      date: new Date('2024-05-16T13:47:00.629Z'),
      durationMs: 255163,
    },
  ],
  testConnector2: [
    {
      connectorId: 'testConnector2',
      date: new Date('2024-05-16T14:26:25.273Z'),
      durationMs: 130447,
    },
  ],
  testConnector3: [
    {
      connectorId: 'testConnector3',
      date: new Date('2024-05-16T14:36:53.171Z'),
      durationMs: 46614,
    },
    {
      connectorId: 'testConnector3',
      date: new Date('2024-05-16T14:27:17.187Z'),
      durationMs: 44129,
    },
  ],
};

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('encodeGenerationIntervals', () => {
    it('returns null when generationIntervals is invalid', () => {
      const invalidGenerationIntervals: Record<string, GenerationInterval[]> =
        1n as unknown as Record<string, GenerationInterval[]>; // <-- invalid

      const result = encodeGenerationIntervals(invalidGenerationIntervals);

      expect(result).toBeNull();
    });

    it('returns the expected encoded generationIntervals', () => {
      const result = encodeGenerationIntervals(generationIntervals);

      expect(result).toEqual(JSON.stringify(generationIntervals));
    });
  });

  describe('decodeGenerationIntervals', () => {
    it('returns null when generationIntervals is invalid', () => {
      const invalidGenerationIntervals = 'invalid generation intervals'; // <-- invalid

      const result = decodeGenerationIntervals(invalidGenerationIntervals);

      expect(result).toBeNull();
    });

    it('returns the expected decoded generation intervals', () => {
      const encoded = encodeGenerationIntervals(generationIntervals) ?? ''; // <-- valid intervals

      const result = decodeGenerationIntervals(encoded);

      expect(result).toEqual(generationIntervals);
    });

    it('parses date strings into Date objects', () => {
      const encoded = JSON.stringify({
        'test-connector-1': [
          {
            connectorId: 'test-connector-1',
            date: '2024-05-16T14:13:09.838Z',
            durationMs: 173648,
          },
        ],
      });

      const result = decodeGenerationIntervals(encoded);

      expect(result).toEqual({
        'test-connector-1': [
          {
            connectorId: 'test-connector-1',
            date: new Date('2024-05-16T14:13:09.838Z'),
            durationMs: 173648,
          },
        ],
      });
    });

    it('returns null when date is not a string', () => {
      const encoded = JSON.stringify({
        'test-connector-1': [
          {
            connectorId: 'test-connector-1',
            date: 1234, // <-- invalid
            durationMs: 173648,
          },
        ],
      });

      const result = decodeGenerationIntervals(encoded);

      expect(result).toBeNull();
    });
  });

  describe('getLocalStorageGenerationIntervals', () => {
    it('returns null when the key is empty', () => {
      const result = getLocalStorageGenerationIntervals(''); // <-- empty key

      expect(result).toBeNull();
    });

    it('returns null the key is unknown', () => {
      const result = getLocalStorageGenerationIntervals('unknown key'); // <-- unknown key

      expect(result).toBeNull();
    });

    it('returns null when the generation intervals are invalid', () => {
      localStorage.setItem(key, 'invalid generation intervals'); // <-- invalid

      const result = getLocalStorageGenerationIntervals(key);

      expect(result).toBeNull();
    });

    it('returns the expected decoded generation intervals', () => {
      const encoded = encodeGenerationIntervals(generationIntervals) ?? ''; // <-- valid intervals
      localStorage.setItem(key, encoded);

      const decoded = decodeGenerationIntervals(encoded);
      const result = getLocalStorageGenerationIntervals(key);

      expect(result).toEqual(decoded);
    });
  });

  describe('setLocalStorageGenerationIntervals', () => {
    const localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    it('sets the encoded generation intervals in localStorage', () => {
      const encoded = encodeGenerationIntervals(generationIntervals) ?? '';

      setLocalStorageGenerationIntervals({ key, generationIntervals });

      expect(localStorageSetItemSpy).toHaveBeenCalledWith(key, encoded);
    });
  });
});

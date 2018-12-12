/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Stackframe } from '../../../../../typings/APMDoc';
import { getCollapsedLibraryFrames, hasSourceLines } from '../stacktraceUtils';
import stacktracesMock from './stacktraces.json';

const stackframeMockWithSource = stacktracesMock[0];
const stackframeMockWithoutSource = stacktracesMock[1];

describe('stactraceUtils', () => {
  describe('getCollapsedLibraryFrames', () => {
    it('should collapse the library frames into a set of grouped, nested stackframes', () => {
      const result = getCollapsedLibraryFrames(stacktracesMock as Stackframe[]);
      expect(result.length).toBe(3);
      expect(result[0].libraryFrame).toBe(false);
      expect(result[1].libraryFrame).toBe(true);
      expect(result[1].stackframes).toHaveLength(2); // two nested stackframes
      expect(result[2].libraryFrame).toBe(false);
    });
  });

  describe('hasSourceLines', () => {
    it('should return true given a stackframe with a source context', () => {
      const result = hasSourceLines(stackframeMockWithSource as Stackframe);
      expect(result).toBe(true);
    });
    it('should return false given a stackframe with no source context', () => {
      const result = hasSourceLines(stackframeMockWithoutSource as Stackframe);
      expect(result).toBe(false);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreeVersionsOf } from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
} from '../../../../../../../../common/api/detection_engine';
import { scalarArrayDiffAlgorithm } from './scalar_array_diff_algorithm';

describe('scalarArrayDiffAlgorithm', () => {
  it('returns current_version as merged output if there is no update - scenario AAA', () => {
    const mockVersions: ThreeVersionsOf<string[]> = {
      base_version: ['A'],
      current_version: ['A'],
      target_version: ['A'],
    };

    const result = scalarArrayDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  it('returns current_version as merged output if current_version is different and there is no update - scenario ABA', () => {
    const mockVersions: ThreeVersionsOf<string[]> = {
      base_version: ['A'],
      current_version: ['B'],
      target_version: ['A'],
    };

    const result = scalarArrayDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  it('returns target_version as merged output if current_version is the same and there is an update - scenario AAB', () => {
    const mockVersions: ThreeVersionsOf<string[]> = {
      base_version: ['A'],
      current_version: ['A'],
      target_version: ['B'],
    };

    const result = scalarArrayDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.target_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Target,
        has_conflict: false,
      })
    );
  });

  it('returns current_version as merged output if current version is different but it matches the update - scenario ABB', () => {
    const mockVersions: ThreeVersionsOf<string[]> = {
      base_version: ['A'],
      current_version: ['B'],
      target_version: ['B'],
    };

    const result = scalarArrayDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  it('returns custom merged version as merged output if all three versions are different - scenario ABC', () => {
    const mockVersions: ThreeVersionsOf<string[]> = {
      base_version: ['A'],
      current_version: ['B', 'C'],
      target_version: ['C', 'D'],
    };
    const expectedMergedVersion = ['B', 'C', 'D'];

    const result = scalarArrayDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: expectedMergedVersion,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Merged,
        has_conflict: false,
      })
    );
  });

  describe('if base_version is missing', () => {
    it('returns current_version as merged output if current_version and target_version are the same - scenario -AA', () => {
      const mockVersions: ThreeVersionsOf<string[]> = {
        base_version: MissingVersion,
        current_version: ['A'],
        target_version: ['A'],
      };

      const result = scalarArrayDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          has_conflict: false,
        })
      );
    });

    it('returns target_version as merged output if current_version and target_version are different - scenario -AB', () => {
      const mockVersions: ThreeVersionsOf<string[]> = {
        base_version: MissingVersion,
        current_version: ['A'],
        target_version: ['B'],
      };

      const result = scalarArrayDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          has_conflict: false,
        })
      );
    });
  });

  describe('edge cases', () => {
    it('compares arrays agnostic of order', () => {
      const mockVersions: ThreeVersionsOf<string[]> = {
        base_version: ['A', 'B'],
        current_version: ['B', 'A'],
        target_version: ['A', 'B'],
      };

      const result = scalarArrayDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          has_conflict: false,
        })
      );
    });

    it('compares arrays case insensitively', () => {
      const mockVersions: ThreeVersionsOf<string[]> = {
        base_version: ['a'],
        current_version: ['A'],
        target_version: ['A'],
      };

      const result = scalarArrayDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          has_conflict: false,
        })
      );
    });
  });
});

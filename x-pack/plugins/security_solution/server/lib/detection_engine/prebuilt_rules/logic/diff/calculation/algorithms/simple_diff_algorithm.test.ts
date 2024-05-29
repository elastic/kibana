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
import { simpleDiffAlgorithm } from './simple_diff_algorithm';

const mockStringFieldVersions: ThreeVersionsOf<string> = {
  base_version: 'rule name',
  current_version: 'rule name',
  target_version: 'rule name',
};

describe('simpleDiffAlgorithm', () => {
  // AAA
  it('returns current_version as merged output if there is no update', () => {
    const result = simpleDiffAlgorithm(mockStringFieldVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockStringFieldVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  // ABA
  it('returns current_version as merged output if current_version is different and there is no update', () => {
    const newMockStringFieldVersions: ThreeVersionsOf<string> = {
      ...mockStringFieldVersions,
      current_version: 'custom rule name',
    };
    const result = simpleDiffAlgorithm(newMockStringFieldVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: newMockStringFieldVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  // AAB
  it('returns target_version as merged output if current_version is the same and there is an update', () => {
    const newMockStringFieldVersions: ThreeVersionsOf<string> = {
      ...mockStringFieldVersions,
      target_version: 'updated rule name',
    };
    const result = simpleDiffAlgorithm(newMockStringFieldVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: newMockStringFieldVersions.target_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Target,
        has_conflict: false,
      })
    );
  });

  // ABB
  it('returns current_version as merged output if current version is different but it matches the update', () => {
    const newMockStringFieldVersions: ThreeVersionsOf<string> = {
      ...mockStringFieldVersions,
      current_version: 'updated rule name',
      target_version: 'updated rule name',
    };
    const result = simpleDiffAlgorithm(newMockStringFieldVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: newMockStringFieldVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  // ABC
  it('returns current_version as merged output if all three versions are different', () => {
    const newMockStringFieldVersions: ThreeVersionsOf<string> = {
      base_version: 'rule name',
      current_version: 'custom rule name',
      target_version: 'updated rule name',
    };
    const result = simpleDiffAlgorithm(newMockStringFieldVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: newMockStringFieldVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Conflict,
        has_conflict: true,
      })
    );
  });

  describe('if base_version is missing', () => {
    it('returns current_version as merged output if current_version and target_version are the same', () => {
      const newMockFieldVersions: ThreeVersionsOf<string> = {
        ...mockStringFieldVersions,
        base_version: MissingVersion,
      };

      const result = simpleDiffAlgorithm(newMockFieldVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: newMockFieldVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          has_conflict: false,
        })
      );
    });

    it('returns target_version as merged output if current_version and target_version are different', () => {
      const newMockFieldVersions: ThreeVersionsOf<string> = {
        ...mockStringFieldVersions,
        base_version: MissingVersion,
        target_version: 'updated rule name',
      };

      const result = simpleDiffAlgorithm(newMockFieldVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: newMockFieldVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          has_conflict: false,
        })
      );
    });
  });
});

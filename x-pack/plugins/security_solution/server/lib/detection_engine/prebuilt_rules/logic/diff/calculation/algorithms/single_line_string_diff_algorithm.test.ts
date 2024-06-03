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
import { singleLineStringDiffAlgorithm } from './single_line_string_diff_algorithm';

describe('singleLineStringDiffAlgorithm', () => {
  it('returns current_version as merged output if there is no update', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'A',
      current_version: 'A',
      target_version: 'A',
    };

    const result = singleLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  it('returns current_version as merged output if current_version is different and there is no update', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'A',
      current_version: 'B',
      target_version: 'A',
    };

    const result = singleLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  it('returns target_version as merged output if current_version is the same and there is an update', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'A',
      current_version: 'A',
      target_version: 'B',
    };

    const result = singleLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.target_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Target,
        has_conflict: false,
      })
    );
  });

  it('returns current_version as merged output if current version is different but it matches the update', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'A',
      current_version: 'B',
      target_version: 'B',
    };

    const result = singleLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  it('returns current_version as merged output if all three versions are different', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'A',
      current_version: 'B',
      target_version: 'C',
    };

    const result = singleLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Conflict,
        has_conflict: true,
      })
    );
  });

  describe('if base_version is missing', () => {
    it('returns current_version as merged output if current_version and target_version are the same', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: MissingVersion,
        current_version: 'A',
        target_version: 'A',
      };

      const result = singleLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          has_conflict: false,
        })
      );
    });

    it('returns target_version as merged output if current_version and target_version are different', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: MissingVersion,
        current_version: 'A',
        target_version: 'B',
      };

      const result = singleLineStringDiffAlgorithm(mockVersions);

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
});

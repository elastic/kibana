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
import { multiLineStringDiffAlgorithm } from './multi_line_string_diff_algorithm';

describe('multiLineStringDiffAlgorithm', () => {
  it('returns current_version as merged output if there is no update - scenario AAA', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'My description.\nThis is a second line.',
      current_version: 'My description.\nThis is a second line.',
      target_version: 'My description.\nThis is a second line.',
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

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
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'My description.\nThis is a second line.',
      current_version: 'My GREAT description.\nThis is a second line.',
      target_version: 'My description.\nThis is a second line.',
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

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
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'My description.\nThis is a second line.',
      current_version: 'My description.\nThis is a second line.',
      target_version: 'My GREAT description.\nThis is a second line.',
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

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
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'My description.\nThis is a second line.',
      current_version: 'My GREAT description.\nThis is a second line.',
      target_version: 'My GREAT description.\nThis is a second line.',
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  describe('if all three versions are different - scenario ABC', () => {
    it('returns a computated merged version without a conflict if 3 way merge is possible', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: `My description.\f\nThis is a second\u2001 line.\f\nThis is a third line.`,
        current_version: `My GREAT description.\f\nThis is a second\u2001 line.\f\nThis is a third line.`,
        target_version: `My description.\f\nThis is a second\u2001 line.\f\nThis is a GREAT line.`,
      };

      const expectedMergedVersion = `My GREAT description.\f\nThis is a second\u2001 line.\f\nThis is a GREAT line.`;

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: expectedMergedVersion,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          has_conflict: false,
        })
      );
    });

    it('returns the current_version with a conflict if 3 way merge is not possible', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: 'My description.\nThis is a second line.',
        current_version: 'My GREAT description.\nThis is a third line.',
        target_version: 'My EXCELLENT description.\nThis is a fourth.',
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Conflict,
          has_conflict: true,
        })
      );
    });
  });

  describe('if base_version is missing', () => {
    it('returns current_version as merged output if current_version and target_version are the same - scenario -AA', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: MissingVersion,
        current_version: 'My description.\nThis is a second line.',
        target_version: 'My description.\nThis is a second line.',
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

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
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: MissingVersion,
        current_version: `My GREAT description.\nThis is a second line.`,
        target_version: `My description.\nThis is a second line, now longer.`,
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

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

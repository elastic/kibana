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
      base_version: ['one', 'two', 'three'],
      current_version: ['one', 'two', 'three'],
      target_version: ['one', 'two', 'three'],
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
      base_version: ['one', 'two', 'three'],
      current_version: ['one', 'three', 'four'],
      target_version: ['one', 'two', 'three'],
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
      base_version: ['one', 'two', 'three'],
      current_version: ['one', 'two', 'three'],
      target_version: ['one', 'four', 'three'],
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
      base_version: ['one', 'two', 'three'],
      current_version: ['one', 'three', 'four'],
      target_version: ['one', 'four', 'three'],
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
      base_version: ['one', 'two', 'three'],
      current_version: ['two', 'three', 'four', 'five'],
      target_version: ['one', 'three', 'four', 'six'],
    };
    const expectedMergedVersion = ['three', 'four', 'five', 'six'];

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
        current_version: ['one', 'two', 'three'],
        target_version: ['one', 'two', 'three'],
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
        current_version: ['one', 'two', 'three'],
        target_version: ['one', 'four', 'three'],
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
        base_version: ['one', 'two', 'three'],
        current_version: ['one', 'three', 'two'],
        target_version: ['three', 'one', 'two'],
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

    describe('compares arrays deduplicated', () => {
      it('when values duplicated in base version', () => {
        const mockVersions: ThreeVersionsOf<string[]> = {
          base_version: ['one', 'two', 'two'],
          current_version: ['one', 'two'],
          target_version: ['one', 'two'],
        };
        const expectedMergedVersion = ['one', 'two'];

        const result = scalarArrayDiffAlgorithm(mockVersions);

        expect(result).toEqual(
          expect.objectContaining({
            merged_version: expectedMergedVersion,
            diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            has_conflict: false,
          })
        );
      });

      it('when values are duplicated in current version', () => {
        const mockVersions: ThreeVersionsOf<string[]> = {
          base_version: ['one', 'two'],
          current_version: ['one', 'two', 'two'],
          target_version: ['one', 'two'],
        };
        const expectedMergedVersion = ['one', 'two'];

        const result = scalarArrayDiffAlgorithm(mockVersions);

        expect(result).toEqual(
          expect.objectContaining({
            merged_version: expectedMergedVersion,
            diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            has_conflict: false,
          })
        );
      });

      it('when values are duplicated in target version', () => {
        const mockVersions: ThreeVersionsOf<string[]> = {
          base_version: ['one', 'two'],
          current_version: ['one', 'two'],
          target_version: ['one', 'two', 'two'],
        };
        const expectedMergedVersion = ['one', 'two'];

        const result = scalarArrayDiffAlgorithm(mockVersions);

        expect(result).toEqual(
          expect.objectContaining({
            merged_version: expectedMergedVersion,
            diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            has_conflict: false,
          })
        );
      });

      it('when values are duplicated in all versions', () => {
        const mockVersions: ThreeVersionsOf<string[]> = {
          base_version: ['one', 'two', 'two'],
          current_version: ['two', 'two', 'three'],
          target_version: ['one', 'one', 'three', 'three'],
        };
        const expectedMergedVersion = ['three'];

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
    });

    describe('compares empty arrays', () => {
      it('when base version is empty', () => {
        const mockVersions: ThreeVersionsOf<string[]> = {
          base_version: [],
          current_version: ['one', 'two'],
          target_version: ['one', 'two'],
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

      it('when current version is empty', () => {
        const mockVersions: ThreeVersionsOf<string[]> = {
          base_version: ['one', 'two'],
          current_version: [],
          target_version: ['one', 'two'],
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

      it('when target version is empty', () => {
        const mockVersions: ThreeVersionsOf<string[]> = {
          base_version: ['one', 'two'],
          current_version: ['one', 'two'],
          target_version: [],
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

      it('when all versions are empty', () => {
        const mockVersions: ThreeVersionsOf<string[]> = {
          base_version: [],
          current_version: [],
          target_version: [],
        };

        const result = scalarArrayDiffAlgorithm(mockVersions);

        expect(result).toEqual(
          expect.objectContaining({
            merged_version: [],
            diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            has_conflict: false,
          })
        );
      });
    });
  });
});

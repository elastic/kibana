/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleDataSource,
  ThreeVersionsOf,
} from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  DataSourceType,
} from '../../../../../../../../common/api/detection_engine';
import { dataSourceDiffAlgorithm } from './data_source_diff_algorithm';

describe('dataSourceDiffAlgorithm', () => {
  describe('returns current_version as merged output if there is no update - scenario AAA', () => {
    it('if all versions are index patterns', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
        current_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
        target_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          has_conflict: false,
        })
      );
    });

    it('if all versions are data views', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: { type: DataSourceType.data_view, data_view_id: '123' },
        current_version: { type: DataSourceType.data_view, data_view_id: '123' },
        target_version: { type: DataSourceType.data_view, data_view_id: '123' },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

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

  describe('returns current_version as merged output if current_version is different and there is no update - scenario ABA', () => {
    it('if current version is different data type than base and target', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
        current_version: { type: DataSourceType.data_view, data_view_id: '123' },
        target_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          has_conflict: false,
        })
      );
    });

    it('if all versions are same data type', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
        current_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'three', 'four'],
        },
        target_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          has_conflict: false,
        })
      );
    });
  });

  describe('returns target_version as merged output if current_version is the same and there is an update - scenario AAB', () => {
    it('if target version is different data type than base and current', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: { type: DataSourceType.data_view, data_view_id: '123' },
        current_version: { type: DataSourceType.data_view, data_view_id: '123' },
        target_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          has_conflict: false,
        })
      );
    });

    it('if all versions are same data type', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: { type: DataSourceType.data_view, data_view_id: '123' },
        current_version: { type: DataSourceType.data_view, data_view_id: '123' },
        target_version: { type: DataSourceType.data_view, data_view_id: '456' },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

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

  it('returns current_version as merged output if current version is different but it matches the update - scenario ABB', () => {
    const mockVersions: ThreeVersionsOf<RuleDataSource> = {
      base_version: {
        type: DataSourceType.index_patterns,
        index_patterns: ['one', 'two', 'three'],
      },
      current_version: {
        type: DataSourceType.index_patterns,
        index_patterns: ['one', 'three', 'four'],
      },
      target_version: {
        type: DataSourceType.index_patterns,
        index_patterns: ['one', 'three', 'four'],
      },
    };

    const result = dataSourceDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        has_conflict: false,
      })
    );
  });

  describe('returns current_version as merged output if all three versions are different - scenario ABC', () => {
    it('if all versions are index patterns', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
        current_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'three', 'four'],
        },
        target_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'five'],
        },
      };

      const expectedMergedVersion: RuleDataSource = {
        type: DataSourceType.index_patterns,
        index_patterns: ['one', 'four', 'five'],
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: expectedMergedVersion,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          has_conflict: false,
        })
      );
    });

    it('if all versions are data views', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: { type: DataSourceType.data_view, data_view_id: '123' },
        current_version: { type: DataSourceType.data_view, data_view_id: '456' },
        target_version: { type: DataSourceType.data_view, data_view_id: '789' },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Conflict,
          has_conflict: true,
        })
      );
    });

    it('if base version is a different data type', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: { type: DataSourceType.data_view, data_view_id: '123' },
        current_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'three', 'four'],
        },
        target_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'five'],
        },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Conflict,
          has_conflict: true,
        })
      );
    });

    it('if currrent version is a different data type', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: { type: DataSourceType.data_view, data_view_id: '123' },
        current_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'three', 'four'],
        },
        target_version: { type: DataSourceType.data_view, data_view_id: '789' },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Conflict,
          has_conflict: true,
        })
      );
    });

    it('if target version is a different data type', () => {
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'two', 'three'],
        },
        current_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'three', 'four'],
        },
        target_version: { type: DataSourceType.data_view, data_view_id: '789' },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

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
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: MissingVersion,
        current_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'three', 'four'],
        },
        target_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'three', 'four'],
        },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

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
      const mockVersions: ThreeVersionsOf<RuleDataSource> = {
        base_version: MissingVersion,
        current_version: { type: DataSourceType.data_view, data_view_id: '456' },
        target_version: {
          type: DataSourceType.index_patterns,
          index_patterns: ['one', 'three', 'four'],
        },
      };

      const result = dataSourceDiffAlgorithm(mockVersions);

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

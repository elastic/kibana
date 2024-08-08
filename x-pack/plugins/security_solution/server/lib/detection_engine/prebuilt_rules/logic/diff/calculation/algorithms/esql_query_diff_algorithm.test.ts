/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleEsqlQuery,
  ThreeVersionsOf,
} from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
} from '../../../../../../../../common/api/detection_engine';
import { esqlQueryDiffAlgorithm } from './esql_query_diff_algorithm';

describe('esqlQueryDiffAlgorithm', () => {
  it('returns current_version as merged output if there is no update - scenario AAA', () => {
    const mockVersions: ThreeVersionsOf<RuleEsqlQuery> = {
      base_version: {
        query: 'query where true',
        language: 'esql',
      },
      current_version: {
        query: 'query where true',
        language: 'esql',
      },
      target_version: {
        query: 'query where true',
        language: 'esql',
      },
    };

    const result = esqlQueryDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        conflict: ThreeWayDiffConflict.NONE,
      })
    );
  });

  it('returns current_version as merged output if current_version is different and there is no update - scenario ABA', () => {
    const mockVersions: ThreeVersionsOf<RuleEsqlQuery> = {
      base_version: {
        query: 'query where true',
        language: 'esql',
      },
      current_version: {
        query: 'query where false',
        language: 'esql',
      },
      target_version: {
        query: 'query where true',
        language: 'esql',
      },
    };

    const result = esqlQueryDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        conflict: ThreeWayDiffConflict.NONE,
      })
    );
  });

  it('returns target_version as merged output if current_version is the same and there is an update - scenario AAB', () => {
    const mockVersions: ThreeVersionsOf<RuleEsqlQuery> = {
      base_version: {
        query: 'query where true',
        language: 'esql',
      },
      current_version: {
        query: 'query where true',
        language: 'esql',
      },
      target_version: {
        query: 'query where false',
        language: 'esql',
      },
    };

    const result = esqlQueryDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.target_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        merge_outcome: ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.NONE,
      })
    );
  });

  it('returns current_version as merged output if current version is different but it matches the update - scenario ABB', () => {
    const mockVersions: ThreeVersionsOf<RuleEsqlQuery> = {
      base_version: {
        query: 'query where true',
        language: 'esql',
      },
      current_version: {
        query: 'query where false',
        language: 'esql',
      },
      target_version: {
        query: 'query where false',
        language: 'esql',
      },
    };

    const result = esqlQueryDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        merge_outcome: ThreeWayMergeOutcome.Current,
        conflict: ThreeWayDiffConflict.NONE,
      })
    );
  });

  describe('if all three versions are different - scenario ABC', () => {
    it('returns a computated merged version with a solvable conflict if 3-way query field merge is possible', () => {
      const mockVersions: ThreeVersionsOf<RuleEsqlQuery> = {
        base_version: {
          query: 'My description.\f\nThis is a second\u2001 line.\f\nThis is a third line.',
          language: 'esql',
        },
        current_version: {
          query: 'My GREAT description.\f\nThis is a second\u2001 line.\f\nThis is a third line.',
          language: 'esql',
        },
        target_version: {
          query: 'My description.\f\nThis is a second\u2001 line.\f\nThis is a GREAT line.',
          language: 'esql',
        },
      };

      const expectedMergedVersion: RuleEsqlQuery = {
        query: `My GREAT description.\f\nThis is a second\u2001 line.\f\nThis is a GREAT line.`,
        language: 'esql',
      };

      const result = esqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: expectedMergedVersion,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
        })
      );
    });

    it('returns the current_version with a non-solvable conflict if 3-way query field merge is not possible', () => {
      const mockVersions: ThreeVersionsOf<RuleEsqlQuery> = {
        base_version: {
          query: 'My description.\nThis is a second line.',
          language: 'esql',
        },
        current_version: {
          query: 'My GREAT description.\nThis is a third line.',
          language: 'esql',
        },
        target_version: {
          query: 'My EXCELLENT description.\nThis is a fourth.',
          language: 'esql',
        },
      };

      const result = esqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
        })
      );
    });
  });

  describe('if base_version is missing', () => {
    it('returns current_version as merged output if current_version and target_version are the same - scenario -AA', () => {
      const mockVersions: ThreeVersionsOf<RuleEsqlQuery> = {
        base_version: MissingVersion,
        current_version: {
          query: 'query where true',
          language: 'esql',
        },
        target_version: {
          query: 'query where true',
          language: 'esql',
        },
      };

      const result = esqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          has_base_version: false,
          base_version: undefined,
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('returns target_version as merged output if current_version and target_version are different - scenario -AB', () => {
      const mockVersions: ThreeVersionsOf<RuleEsqlQuery> = {
        base_version: MissingVersion,
        current_version: {
          query: 'query where true',
          language: 'esql',
        },
        target_version: {
          query: 'query where false',
          language: 'esql',
        },
      };

      const result = esqlQueryDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          has_base_version: false,
          base_version: undefined,
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.SOLVABLE,
        })
      );
    });
  });
});

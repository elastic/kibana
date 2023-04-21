/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildCategoryScoreAssignment,
  buildCategoryWeights,
  buildWeightingOfScoreByCategory,
  GLOBAL_IDENTIFIER_WEIGHT_TYPE,
  RISK_CATEGORY_WEIGHT_TYPE,
} from './category_weights';

describe('buildCategoryWeights', () => {
  it('returns the default weights if nothing else is provided', () => {
    const result = buildCategoryWeights();

    expect(result).toEqual([{ host: 1, type: 'risk_category', user: 1, value: 'alerts' }]);
  });

  it('allows user weights to override defaults', () => {
    const result = buildCategoryWeights([
      { type: 'risk_category', value: 'alerts', host: 0.1, user: 0.2 },
    ]);

    expect(result).toEqual([{ host: 0.1, type: 'risk_category', user: 0.2, value: 'alerts' }]);
  });

  it('uses default category weights if unspecified in user-provided weight', () => {
    const result = buildCategoryWeights([{ type: 'risk_category', value: 'alerts', host: 0.1 }]);

    expect(result).toEqual([{ host: 0.1, type: 'risk_category', user: 1, value: 'alerts' }]);
  });
});

describe('buildCategoryScoreAssignment', () => {
  it('builds the expected assignment statement', () => {
    const result = buildCategoryScoreAssignment();

    expect(result).toMatchInlineSnapshot(
      `"if (inputs[i].category == 'signal') { results['alerts_score'] += current_score; } else { results['other_score'] += current_score; }"`
    );
  });
});

describe('buildWeightingOfScoreByCategory', () => {
  it('returns default weights if no user values provided', () => {
    const result = buildWeightingOfScoreByCategory({ identifierType: 'user' });

    expect(result).toMatchInlineSnapshot(
      `"if (category == 'signal') { weighted_score = score * 1; } else { weighted_score = score; }"`
    );
  });

  it('returns default weights if no weights provided', () => {
    const result = buildWeightingOfScoreByCategory({ userWeights: [], identifierType: 'host' });

    expect(result).toMatchInlineSnapshot(
      `"if (category == 'signal') { weighted_score = score * 1; } else { weighted_score = score; }"`
    );
  });

  it('returns default weights if only global weights provided', () => {
    const result = buildWeightingOfScoreByCategory({
      userWeights: [{ type: GLOBAL_IDENTIFIER_WEIGHT_TYPE, host: 0.1 }],
      identifierType: 'host',
    });

    expect(result).toMatchInlineSnapshot(
      `"if (category == 'signal') { weighted_score = score * 1; } else { weighted_score = score; }"`
    );
  });

  it('returns specified weight when a category weight is provided', () => {
    const result = buildWeightingOfScoreByCategory({
      userWeights: [{ type: RISK_CATEGORY_WEIGHT_TYPE, value: 'alerts', host: 0.1, user: 0.2 }],
      identifierType: 'host',
    });

    expect(result).toMatchInlineSnapshot(
      `"if (category == 'signal') { weighted_score = score * 0.1; } else { weighted_score = score; }"`
    );
  });

  it('returns a default weight when a category weight is provided but not the one being used', () => {
    const result = buildWeightingOfScoreByCategory({
      userWeights: [{ type: RISK_CATEGORY_WEIGHT_TYPE, value: 'alerts', host: 0.1 }],
      identifierType: 'user',
    });

    expect(result).toMatchInlineSnapshot(
      `"if (category == 'signal') { weighted_score = score * 1; } else { weighted_score = score; }"`
    );
  });
});

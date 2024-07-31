/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KqlQueryType,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../common/api/detection_engine';
import type { PartialRuleDiff } from '../../../../../common/api/detection_engine';
import { TestProviders } from '../../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { PerFieldRuleDiffTab } from './per_field_rule_diff_tab';

const ruleFieldsDiffBaseFieldsMock = {
  diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
  conflict: ThreeWayDiffConflict.NONE,
  has_update: true,
  has_base_version: true,
  merge_outcome: ThreeWayMergeOutcome.Target,
};

const ruleFieldsDiffMock: PartialRuleDiff = {
  fields: {
    version: {
      ...ruleFieldsDiffBaseFieldsMock,
      base_version: 1,
      current_version: 1,
      merged_version: 2,
      target_version: 2,
    },
  },
  num_fields_with_updates: 1,
  num_fields_with_conflicts: 0,
  num_fields_with_non_solvable_conflicts: 0,
};

const renderPerFieldRuleDiffTab = (ruleDiff: PartialRuleDiff) => {
  return render(
    <TestProviders>
      <PerFieldRuleDiffTab ruleDiff={ruleDiff} />
    </TestProviders>
  );
};

describe('PerFieldRuleDiffTab', () => {
  test('Field groupings should be rendered together in the same accordion panel', () => {
    const mockData: PartialRuleDiff = {
      ...ruleFieldsDiffMock,
      fields: {
        kql_query: {
          ...ruleFieldsDiffBaseFieldsMock,
          base_version: {
            filters: [],
            language: 'lucene',
            query: 'old query',
            type: KqlQueryType.inline_query,
          },
          current_version: {
            filters: [],
            language: 'lucene',
            query: 'old query',
            type: KqlQueryType.inline_query,
          },
          merged_version: {
            filters: [],
            language: 'kuery',
            query: 'new query',
            type: KqlQueryType.inline_query,
          },
          target_version: {
            filters: [],
            language: 'kuery',
            query: 'new query',
            type: KqlQueryType.inline_query,
          },
        },
      },
    };
    const wrapper = renderPerFieldRuleDiffTab(mockData);

    const matchedSubtitleElements = wrapper.queryAllByTestId('ruleUpgradePerFieldDiffSubtitle');
    const subtitles = matchedSubtitleElements.map((element) => element.textContent);

    // `filters` and `type` have not changed between versions so shouldn't be displayed
    expect(subtitles).toEqual(['Query', 'Language']);
  });

  describe('Undefined values are displayed with empty diffs', () => {
    test('Displays only an updated field value when changed from undefined', () => {
      const mockData: PartialRuleDiff = {
        ...ruleFieldsDiffMock,
        fields: {
          timestamp_field: {
            ...ruleFieldsDiffBaseFieldsMock,
            base_version: undefined,
            current_version: undefined,
            merged_version: 'new timestamp field',
            target_version: 'new timestamp field',
          },
        },
      };
      const wrapper = renderPerFieldRuleDiffTab(mockData);
      const diffContent = wrapper.getByTestId('ruleUpgradePerFieldDiffContent').textContent;

      // Only the new timestamp field should be displayed
      expect(diffContent).toEqual('+new timestamp field');
    });

    test('Displays only an outdated field value when incoming update is undefined', () => {
      const mockData: PartialRuleDiff = {
        ...ruleFieldsDiffMock,
        fields: {
          timestamp_field: {
            ...ruleFieldsDiffBaseFieldsMock,
            base_version: 'old timestamp field',
            current_version: 'old timestamp field',
            merged_version: undefined,
            target_version: undefined,
          },
        },
      };
      const wrapper = renderPerFieldRuleDiffTab(mockData);
      const diffContent = wrapper.getByTestId('ruleUpgradePerFieldDiffContent').textContent;

      // Only the old timestamp_field should be displayed
      expect(diffContent).toEqual('-old timestamp field');
    });
  });

  test('Field diff components have the same grouping and order as in rule details overview', () => {
    const mockData: PartialRuleDiff = {
      ...ruleFieldsDiffMock,
      fields: {
        setup: {
          ...ruleFieldsDiffBaseFieldsMock,
          base_version: 'old setup',
          current_version: 'old setup',
          merged_version: 'new setup',
          target_version: 'new setup',
        },
        timestamp_field: {
          ...ruleFieldsDiffBaseFieldsMock,
          base_version: undefined,
          current_version: undefined,
          merged_version: 'new timestamp',
          target_version: 'new timestamp',
        },
        name: {
          ...ruleFieldsDiffBaseFieldsMock,
          base_version: 'old name',
          current_version: 'old name',
          merged_version: 'new name',
          target_version: 'new name',
        },
      },
    };
    const wrapper = renderPerFieldRuleDiffTab(mockData);

    const matchedSectionElements = wrapper.queryAllByTestId('ruleUpgradePerFieldDiffSectionHeader');
    const sectionLabels = matchedSectionElements.map((element) => element.textContent);

    // Schedule doesn't have any fields in the diff and shouldn't be displayed
    expect(sectionLabels).toEqual(['About', 'Definition', 'Setup guide']);

    const matchedFieldElements = wrapper.queryAllByTestId('ruleUpgradePerFieldDiffLabel');
    const fieldLabels = matchedFieldElements.map((element) => element.textContent);

    expect(fieldLabels).toEqual(['Name', 'Timestamp Field', 'Setup']);
  });
});

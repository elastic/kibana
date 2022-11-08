/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ExceptionsAddToRulesTable } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useFindRulesInMemory } from '../../../../rule_management_ui/components/rules_table/rules_table/use_find_rules_in_memory';
import { getRulesSchemaMock } from '../../../../../../common/detection_engine/rule_schema/mocks';
import type { Rule } from '../../../../rule_management/logic/types';

jest.mock(
  '../../../../rule_management_ui/components/rules_table/rules_table/use_find_rules_in_memory'
);

describe('ExceptionsAddToRulesTable', () => {
  it('it displays loading state while fetching rules', () => {
    (useFindRulesInMemory as jest.Mock).mockReturnValue({
      data: { rules: [], total: 0 },
      isFetched: false,
    });
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsAddToRulesTable initiallySelectedRules={[]} onRuleSelectionChange={jest.fn()} />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemViewerEmptyPrompts-loading"]').exists()
    ).toBeTruthy();
  });

  it('it displays fetched rules', () => {
    (useFindRulesInMemory as jest.Mock).mockReturnValue({
      data: {
        rules: [getRulesSchemaMock(), { ...getRulesSchemaMock(), id: '345', name: 'My rule' }],
        total: 0,
      },
      isFetched: true,
    });
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsAddToRulesTable
          initiallySelectedRules={[{ ...getRulesSchemaMock(), id: '345', name: 'My rule' } as Rule]}
          onRuleSelectionChange={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="exceptionItemViewerEmptyPrompts-loading"]').exists()
    ).toBeFalsy();
    expect(
      wrapper.find('.euiTableRow-isSelected td[data-test-subj="ruleNameCell"]').text()
    ).toEqual('NameMy rule');
  });
});

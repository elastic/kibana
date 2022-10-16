/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ExceptionsLinkedToRule } from '.';
import { TestProviders } from '../../../../../common/mock';
import { getRulesSchemaMock } from '../../../../../../common/detection_engine/rule_schema/mocks';
import type { Rule } from '../../../../rule_management/logic/types';

jest.mock('../../../../rule_management/logic/use_find_rules_query');

describe('ExceptionsLinkedToRule', () => {
  it('it displays rule name and link', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsLinkedToRule
          rule={{ ...getRulesSchemaMock(), id: '345', name: 'My rule' } as Rule}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="ruleNameCell"]').at(0).text()).toEqual('NameMy rule');
    expect(wrapper.find('[data-test-subj="ruleAction-viewDetails"]').exists()).toBeTruthy();
  });
});

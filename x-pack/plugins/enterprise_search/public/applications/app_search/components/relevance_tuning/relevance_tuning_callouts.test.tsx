/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/engine_logic.mock';
import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { RelevanceTuningCallouts } from './relevance_tuning_callouts';

describe('RelevanceTuningCallouts', () => {
  const values = {
    engineHasSchemaFields: true,
    engine: {
      invalidBoosts: false,
      unsearchedUnconfirmedFields: false,
    },
    schemaFieldsWithConflicts: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  const subject = () => shallow(<RelevanceTuningCallouts />);

  it('renders', () => {
    const wrapper = subject();
    expect(wrapper.find('[data-test-subj="RelevanceTuningInvalidBoostsCallout"]').exists()).toBe(
      false
    );
    expect(wrapper.find('[data-test-subj="RelevanceTuningUnsearchedFieldsCallout"]').exists()).toBe(
      false
    );
    expect(subject().find('[data-test-subj="SchemaConflictsCallout"]').exists()).toBe(false);
  });

  it('shows a message when there are invalid boosts', () => {
    // An invalid boost would be if a user creats a functional boost on a number field, then that
    // field later changes to text. At this point, the boost still exists but is invalid for
    // a text field.
    setMockValues({
      ...values,
      engine: {
        invalidBoosts: true,
        unsearchedUnconfirmedFields: false,
      },
    });
    expect(subject().find('[data-test-subj="RelevanceTuningInvalidBoostsCallout"]').exists()).toBe(
      true
    );
  });

  it('shows a message when there are unconfirmed fields', () => {
    // An invalid boost would be if a user creats a functional boost on a number field, then that
    // field later changes to text. At this point, the boost still exists but is invalid for
    // a text field.
    setMockValues({
      ...values,
      engine: {
        invalidBoosts: false,
        unsearchedUnconfirmedFields: true,
      },
    });
    expect(
      subject().find('[data-test-subj="RelevanceTuningUnsearchedFieldsCallout"]').exists()
    ).toBe(true);
  });

  it('shows a message when there are schema field conflicts', () => {
    // Schema conflicts occur when a meta engine has fields in source engines with have differing types,
    // hence relevance tuning cannot be applied as we don't know the actual type
    setMockValues({
      ...values,
      schemaFieldsWithConflicts: ['fe', 'fi', 'fo'],
    });
    expect(subject().find('[data-test-subj="SchemaConflictsCallout"]').exists()).toBe(true);
  });
});

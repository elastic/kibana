/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { StepRuleActions } from './index';

jest.mock('../../../../../lib/kibana');

describe('StepRuleActions', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <StepRuleActions actionMessageParams={[]} isReadOnlyView={false} isLoading={false} />
    );

    expect(wrapper.find('[data-test-subj="stepRuleActions"]')).toHaveLength(1);
  });
});

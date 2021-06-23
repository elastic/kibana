/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { HelpText } from './help_text';

describe('MlJobSelect help text', () => {
  it('does not show warning if all jobs are running', () => {
    const wrapper = shallow(<HelpText href={'https://test.com'} notRunningJobIds={[]} />);
    expect(wrapper.find('[data-test-subj="ml-warning-not-running-jobs"]')).toHaveLength(0);
  });

  it('shows warning if there are jobs not running', () => {
    const wrapper = shallow(<HelpText href={'https://test.com'} notRunningJobIds={['id']} />);
    expect(wrapper.find('[data-test-subj="ml-warning-not-running-jobs"]')).toHaveLength(1);
  });
});

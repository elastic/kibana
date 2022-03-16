/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { MlPopover } from './ml_popover';

jest.mock('../../lib/kibana');

describe('MlPopover', () => {
  test('shows upgrade popover on mouse click', () => {
    const wrapper = mountWithIntl(<MlPopover />);

    // TODO: Update to use act() https://fb.me/react-wrap-tests-with-act
    wrapper.find('[data-test-subj="integrations-button"]').first().simulate('click');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="ml-popover-upgrade-contents"]').exists()).toEqual(true);
  });
});

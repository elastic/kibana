/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import type { UserActionContentToolbarProps } from './content_toolbar';
import { UserActionContentToolbar } from './content_toolbar';
import { TestProviders } from '../../common/mock';

jest.mock('../../common/navigation/hooks');
jest.mock('../../common/lib/kibana');

const props: UserActionContentToolbarProps = {
  commentMarkdown: '',
  id: '1',
  editLabel: 'edit',
  quoteLabel: 'quote',
  isLoading: false,
  onEdit: jest.fn(),
  onQuote: jest.fn(),
};

describe('UserActionContentToolbar ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(
      <TestProviders>
        <UserActionContentToolbar {...props} />
      </TestProviders>
    );
  });

  it('it renders', async () => {
    expect(wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="property-actions"]').first().exists()).toBeTruthy();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionContentToolbar } from './user_action_content_toolbar';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn().mockReturnValue({ detailName: 'case-1' }),
  };
});

jest.mock('../../../common/components/navigation/use_get_url_search');

jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        application: {
          getUrlForApp: jest.fn(),
        },
      },
    }),
  };
});

const props = {
  id: '1',
  editLabel: 'edit',
  quoteLabel: 'quote',
  disabled: false,
  isLoading: false,
  onEdit: jest.fn(),
  onQuote: jest.fn(),
};

describe('UserActionContentToolbar ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionContentToolbar {...props} />);
  });

  it('it renders', async () => {
    expect(wrapper.find(`[data-test-subj="copy-link-${props.id}"]`).first().exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="property-actions"]').first().exists()).toBeTruthy();
  });
});

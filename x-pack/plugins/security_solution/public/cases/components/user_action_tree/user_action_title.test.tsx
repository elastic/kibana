/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import copy from 'copy-to-clipboard';
import { Router, routeData, mockHistory } from '../__mock__/router';
import { caseUserActions as basicUserActions } from '../../containers/mock';
import { UserActionTitle } from './user_action_title';
import { TestProviders } from '../../../common/mock';

const outlineComment = jest.fn();
const onEdit = jest.fn();
const onQuote = jest.fn();

jest.mock('copy-to-clipboard');
const defaultProps = {
  createdAt: basicUserActions[0].actionAt,
  disabled: false,
  fullName: basicUserActions[0].actionBy.fullName,
  id: basicUserActions[0].actionId,
  isLoading: false,
  labelEditAction: 'labelEditAction',
  labelQuoteAction: 'labelQuoteAction',
  labelTitle: <>{'cool'}</>,
  linkId: basicUserActions[0].commentId,
  onEdit,
  onQuote,
  outlineComment,
  updatedAt: basicUserActions[0].actionAt,
  username: basicUserActions[0].actionBy.username,
};

describe('UserActionTitle ', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(routeData, 'useParams').mockReturnValue({ commentId: '123' });
  });

  it('Calls copy when copy link is clicked', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <UserActionTitle {...defaultProps} />
        </Router>
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="copy-link"]`).first().simulate('click');
    expect(copy).toBeCalledTimes(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText, EuiButtonIcon, EuiCopy } from '@elastic/eui';

import { EXISTING_INVITATION_LABEL } from './constants';

import { UserInvitationCallout } from '.';

describe('UserInvitationCallout', () => {
  const props = {
    isNew: true,
    invitationCode: 'test@test.com',
    urlPrefix: 'http://foo',
  };

  it('renders', () => {
    const wrapper = shallow(<UserInvitationCallout {...props} />);

    expect(wrapper.find(EuiText)).toHaveLength(2);
  });

  it('renders the copy button', () => {
    const copyMock = jest.fn();
    const wrapper = shallow(<UserInvitationCallout {...props} />);

    const copyEl = shallow(<div>{wrapper.find(EuiCopy).props().children(copyMock)}</div>);
    expect(copyEl.find(EuiButtonIcon).props().onClick).toEqual(copyMock);
  });

  it('renders existing invitation label', () => {
    const wrapper = shallow(<UserInvitationCallout {...props} isNew={false} />);

    expect(wrapper.find(EuiText).first().prop('children')).toEqual(
      <strong>{EXISTING_INVITATION_LABEL}</strong>
    );
  });
});

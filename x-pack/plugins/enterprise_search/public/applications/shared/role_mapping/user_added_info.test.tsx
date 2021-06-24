/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { UserAddedInfo } from './';

describe('UserAddedInfo', () => {
  const props = {
    username: 'user1',
    email: 'test@test.com',
    roleType: 'user',
  };

  it('renders with email', () => {
    const wrapper = shallow(<UserAddedInfo {...props} />);

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiText
          size="s"
        >
          <strong>
            Username
          </strong>
        </EuiText>
        <EuiText
          size="s"
        >
          user1
        </EuiText>
        <EuiSpacer />
        <EuiText
          size="s"
        >
          <strong>
            Email
          </strong>
        </EuiText>
        <EuiText
          size="s"
        >
          test@test.com
        </EuiText>
        <EuiSpacer />
        <EuiText
          size="s"
        >
          <strong>
            Role
          </strong>
        </EuiText>
        <EuiText
          size="s"
        >
          user
        </EuiText>
        <EuiSpacer />
      </Fragment>
    `);
  });

  it('renders without email', () => {
    const wrapper = shallow(<UserAddedInfo {...props} email="" />);

    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiText
          size="s"
        >
          <strong>
            Username
          </strong>
        </EuiText>
        <EuiText
          size="s"
        >
          user1
        </EuiText>
        <EuiSpacer />
        <EuiText
          size="s"
        >
          <strong>
            Email
          </strong>
        </EuiText>
        <EuiText
          size="s"
        >
          <EuiTextColor
            color="subdued"
          >
            —
          </EuiTextColor>
        </EuiText>
        <EuiSpacer />
        <EuiText
          size="s"
        >
          <strong>
            Role
          </strong>
        </EuiText>
        <EuiText
          size="s"
        >
          user
        </EuiText>
        <EuiSpacer />
      </Fragment>
    `);
  });
});

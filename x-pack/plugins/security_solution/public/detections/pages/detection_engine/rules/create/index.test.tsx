/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TestProviders } from '../../../../../common/mock';
import { CreateRulePage } from './index';
import { useUserInfo } from '../../../../components/user_info';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../components/user_info');

describe('CreateRulePage', () => {
  it('renders correctly', () => {
    (useUserInfo as jest.Mock).mockReturnValue({});
    const wrapper = shallow(<CreateRulePage />, { wrappingComponent: TestProviders });

    expect(wrapper.find('[title="Create new rule"]')).toHaveLength(1);
  });
});

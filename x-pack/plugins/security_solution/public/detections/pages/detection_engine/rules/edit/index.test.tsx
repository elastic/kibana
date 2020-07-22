/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../../../common/mock/match_media';
import { TestProviders } from '../../../../../common/mock';
import { EditRulePage } from './index';
import { useUserInfo } from '../../../../components/user_info';
import { useParams } from 'react-router-dom';

jest.mock('../../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../components/user_info');
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useHistory: jest.fn(),
    useParams: jest.fn(),
  };
});

describe('EditRulePage', () => {
  it('renders correctly', () => {
    (useUserInfo as jest.Mock).mockReturnValue({});
    (useParams as jest.Mock).mockReturnValue({});
    const wrapper = shallow(<EditRulePage />, { wrappingComponent: TestProviders });

    expect(wrapper.find('[title="Edit rule settings"]')).toHaveLength(1);
  });
});

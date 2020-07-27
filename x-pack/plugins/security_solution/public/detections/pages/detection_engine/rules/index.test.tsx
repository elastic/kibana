/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../../common/mock/match_media';
import { RulesPage } from './index';
import { useUserInfo } from '../../../components/user_info';
import { usePrePackagedRules } from '../../../containers/detection_engine/rules';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../../common/components/link_to');
jest.mock('../../../components/user_info');
jest.mock('../../../containers/detection_engine/rules');

describe('RulesPage', () => {
  beforeAll(() => {
    (useUserInfo as jest.Mock).mockReturnValue({});
    (usePrePackagedRules as jest.Mock).mockReturnValue({});
  });
  it('renders correctly', () => {
    const wrapper = shallow(<RulesPage />);

    expect(wrapper.find('AllRules')).toHaveLength(1);
  });
});

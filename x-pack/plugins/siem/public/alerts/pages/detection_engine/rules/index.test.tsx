/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { RulesPage } from './index';
import { useUserInfo } from '../../../components/user_info';
import { usePrePackagedRules } from '../../../../alerts/containers/detection_engine/rules';

jest.mock('../../../components/user_info');
jest.mock('../../../../alerts/containers/detection_engine/rules');

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

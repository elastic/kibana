/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../../../common/mock/match_media';
import { TestProviders } from '../../../../../common/mock';
import { RuleDetailsPageComponent } from './index';
import { setAbsoluteRangeDatePicker } from '../../../../../common/store/inputs/actions';
import { useUserInfo } from '../../../../components/user_info';
import { useParams } from 'react-router-dom';

jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../components/user_info');
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
    useHistory: jest.fn(),
  };
});

describe('RuleDetailsPageComponent', () => {
  beforeAll(() => {
    (useUserInfo as jest.Mock).mockReturnValue({});
    (useParams as jest.Mock).mockReturnValue({});
  });

  it('renders correctly', () => {
    const wrapper = shallow(
      <RuleDetailsPageComponent
        query={{ query: '', language: 'language' }}
        filters={[]}
        setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(wrapper.find('WithSource')).toHaveLength(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../../../common/mock/match_media';
import { TestProviders } from '../../../../../common/mock';
import { CreateRulePage } from '.';
import { useUserData } from '../../../../components/user_info';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../../containers/detection_engine/rules/use_find_rules_query');
jest.mock('../../../../../common/components/link_to');
jest.mock('../../../../components/user_info');
jest.mock('../../../../../common/hooks/use_app_toasts');

describe('CreateRulePage', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  it('renders correctly', () => {
    (useUserData as jest.Mock).mockReturnValue([{}]);
    const wrapper = shallow(<CreateRulePage />, { wrappingComponent: TestProviders });

    expect(wrapper.find('[title="Create new rule"]')).toHaveLength(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../../common/mock/match_media';
import { TestProviders } from '../../../../common/mock';
import { EditRulePage } from '.';
import { useUserData } from '../../../../detections/components/user_info';
import { useParams } from 'react-router-dom';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../detections/containers/detection_engine/lists/use_lists_config');
jest.mock('../../../rule_management/logic/use_find_rules_query');
jest.mock('../../../../common/components/link_to');
jest.mock('../../../../detections/components/user_info');
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useHistory: jest.fn(),
    useParams: jest.fn(),
  };
});
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../detections/pages/detection_engine/rules/use_get_saved_query', () => ({
  __esModule: true,
  useGetSavedQuery: jest.fn().mockReturnValue({}),
}));

describe('EditRulePage', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  it('renders correctly', () => {
    (useUserData as jest.Mock).mockReturnValue([{}]);
    (useParams as jest.Mock).mockReturnValue({});
    const wrapper = shallow(<EditRulePage />, { wrappingComponent: TestProviders });

    expect(wrapper.find('[title="Edit rule settings"]')).toHaveLength(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount, ReactWrapper } from 'enzyme';

import '../../../../common/mock/match_media';
import { RulesPage } from './index';
import { useUserData } from '../../../components/user_info';
import { waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { getPrePackagedRulesStatus } from '../../../containers/detection_engine/rules/api';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../pages/detection_engine/rules/all/rules_table/rules_table_context');
jest.mock('../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../containers/detection_engine/rules/use_find_rules_query');
jest.mock('../../../../common/components/link_to');
jest.mock('../../../components/user_info');

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/toasters', () => {
  const actual = jest.requireActual('../../../../common/components/toasters');
  return {
    ...actual,
    errorToToaster: jest.fn(),
    useStateToaster: jest.fn().mockReturnValue([jest.fn(), jest.fn()]),
    displaySuccessToast: jest.fn(),
  };
});

jest.mock('../../../containers/detection_engine/rules/api', () => ({
  getPrePackagedRulesStatus: jest.fn().mockResolvedValue({
    rules_not_installed: 0,
    rules_installed: 0,
    rules_not_updated: 0,
    timelines_not_installed: 0,
    timelines_installed: 0,
    timelines_not_updated: 0,
  }),
  createPrepackagedRules: jest.fn(),
}));

jest.mock('../../../components/value_lists_management_modal', () => {
  return {
    ValueListsModal: jest.fn().mockReturnValue(<div />),
  };
});

jest.mock('./all', () => {
  return {
    AllRules: jest.fn().mockReturnValue(<div />),
  };
});

jest.mock('../../../../common/utils/route/spy_routes', () => {
  return {
    SpyRoute: jest.fn().mockReturnValue(<div />),
  };
});

jest.mock('../../../components/rules/pre_packaged_rules/update_callout', () => {
  return {
    UpdatePrePackagedRulesCallOut: jest.fn().mockReturnValue(<div />),
  };
});
jest.mock('../../../../common/hooks/use_app_toasts');

describe('RulesPage', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeAll(() => {
    (useUserData as jest.Mock).mockReturnValue([{}]);
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  it('renders AllRules', () => {
    const wrapper = shallow(<RulesPage />);
    expect(wrapper.find('[data-test-subj="all-rules"]').exists()).toEqual(true);
  });

  it('renders correct button with correct text - Load Elastic prebuilt rules and timeline templates', async () => {
    (getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_not_installed: 3,
      rules_installed: 0,
      rules_not_updated: 0,
      timelines_not_installed: 3,
      timelines_installed: 0,
      timelines_not_updated: 0,
    });

    const wrapper: ReactWrapper = mount(
      <TestProviders>
        <RulesPage />
      </TestProviders>
    );
    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="loadPrebuiltRulesBtn"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="loadPrebuiltRulesBtn"]').last().text()).toEqual(
        'Load Elastic prebuilt rules and timeline templates'
      );
    });
  });

  it('renders correct button with correct text - Load Elastic prebuilt rules', async () => {
    (getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_not_installed: 3,
      rules_installed: 0,
      rules_not_updated: 0,
      timelines_not_installed: 0,
      timelines_installed: 0,
      timelines_not_updated: 0,
    });

    const wrapper: ReactWrapper = mount(
      <TestProviders>
        <RulesPage />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="loadPrebuiltRulesBtn"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="loadPrebuiltRulesBtn"]').last().text()).toEqual(
        'Load Elastic prebuilt rules'
      );
    });
  });

  it('renders correct button with correct text - Load Elastic prebuilt timeline templates', async () => {
    (getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_not_installed: 0,
      rules_installed: 0,
      rules_not_updated: 0,
      timelines_not_installed: 3,
      timelines_installed: 0,
      timelines_not_updated: 0,
    });

    const wrapper: ReactWrapper = mount(
      <TestProviders>
        <RulesPage />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find('[data-test-subj="loadPrebuiltRulesBtn"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="loadPrebuiltRulesBtn"]').last().text()).toEqual(
        'Load Elastic prebuilt timeline templates'
      );
    });
  });

  it('renders a callout - Update Elastic prebuilt rules', async () => {
    (getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_not_installed: 2,
      rules_installed: 1,
      rules_not_updated: 1,
      timelines_not_installed: 0,
      timelines_installed: 0,
      timelines_not_updated: 0,
    });

    const wrapper: ReactWrapper = mount(
      <TestProviders>
        <RulesPage />
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find('[data-test-subj="update-callout-button"]').exists()).toEqual(true);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import React from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { TestProviders } from '../../../../common/mock';
import '../../../../common/mock/match_media';
import { getPrePackagedRulesStatus } from '../../../../detection_engine/rule_management/api/api';
import { PrePackagedRulesPrompt } from './load_empty_prompt';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../../common/components/link_to');
jest.mock('../../../../common/lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../../../common/lib/kibana/kibana_react');
  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(),
        },
      },
    }),
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
jest.mock('../../../../common/hooks/use_app_toasts');

const props = {
  createPrePackagedRules: jest.fn(),
  loading: false,
  userHasPermissions: true,
  'data-test-subj': 'load-prebuilt-rules',
};

describe('PrePackagedRulesPrompt', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = mount(<PrePackagedRulesPrompt {...props} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('EmptyPrompt')).toHaveLength(1);
  });
});

describe('LoadPrebuiltRulesAndTemplatesButton', () => {
  it('renders correct button with correct text - Load Elastic prebuilt rules and timeline templates', async () => {
    (getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_not_installed: 3,
      rules_installed: 0,
      rules_not_updated: 0,
      timelines_not_installed: 3,
      timelines_installed: 0,
      timelines_not_updated: 0,
    });

    const wrapper: ReactWrapper = mount(<PrePackagedRulesPrompt {...props} />, {
      wrappingComponent: TestProviders,
    });
    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="load-prebuilt-rules"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="load-prebuilt-rules"]').last().text()).toEqual(
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

    const wrapper: ReactWrapper = mount(<PrePackagedRulesPrompt {...props} />, {
      wrappingComponent: TestProviders,
    });
    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="load-prebuilt-rules"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="load-prebuilt-rules"]').last().text()).toEqual(
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

    const wrapper: ReactWrapper = mount(<PrePackagedRulesPrompt {...props} />, {
      wrappingComponent: TestProviders,
    });
    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="load-prebuilt-rules"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="load-prebuilt-rules"]').last().text()).toEqual(
        'Load Elastic prebuilt timeline templates'
      );
    });
  });

  it('renders disabled button if loading is true', async () => {
    (getPrePackagedRulesStatus as jest.Mock).mockResolvedValue({
      rules_not_installed: 0,
      rules_installed: 0,
      rules_not_updated: 0,
      timelines_not_installed: 3,
      timelines_installed: 0,
      timelines_not_updated: 0,
    });

    const wrapper: ReactWrapper = mount(
      <PrePackagedRulesPrompt {...{ ...props, loading: true }} />,
      {
        wrappingComponent: TestProviders,
      }
    );
    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('button[data-test-subj="load-prebuilt-rules"]').props().disabled).toEqual(
        true
      );
    });
  });
});

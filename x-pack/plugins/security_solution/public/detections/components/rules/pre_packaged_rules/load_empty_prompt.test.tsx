/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { shallow, mount, ReactWrapper } from 'enzyme';

import '../../../../common/mock/match_media';
import { PrePackagedRulesPrompt } from './load_empty_prompt';
import { getPrePackagedRulesStatus } from '../../../containers/detection_engine/rules/api';

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

const props = {
  createPrePackagedRules: jest.fn(),
  loading: false,
  userHasNoPermissions: false,
  'data-test-subj': 'load-prebuilt-rules',
};

describe('PrePackagedRulesPrompt', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<PrePackagedRulesPrompt {...props} />);

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

    const wrapper: ReactWrapper = mount(<PrePackagedRulesPrompt {...props} />);
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

    const wrapper: ReactWrapper = mount(<PrePackagedRulesPrompt {...props} />);
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

    const wrapper: ReactWrapper = mount(<PrePackagedRulesPrompt {...props} />);
    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="load-prebuilt-rules"]').exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="load-prebuilt-rules"]').last().text()).toEqual(
        'Load Elastic prebuilt timeline templates'
      );
    });
  });
});

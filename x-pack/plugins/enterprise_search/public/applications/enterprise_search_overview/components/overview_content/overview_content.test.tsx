/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt } from '@elastic/eui';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { GettingStartedSteps } from '../../../shared/getting_started_steps';

import { LicenseCallout } from '../license_callout';
import { SetupGuideCta } from '../setup_guide';
import { TrialCallout } from '../trial_callout';

import { OverviewContent } from '.';

describe('OverviewContent', () => {
  const props = {
    access: {},
    isWorkplaceSearchAdmin: true,
  };

  it('renders the overview page, Getting Started steps & setup guide CTAs with no host set', () => {
    setMockValues({ config: { host: '' } });
    const wrapper = shallow(<OverviewContent {...props} />);

    expect(wrapper.find(GettingStartedSteps)).toHaveLength(1);
    expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(SetupGuideCta)).toHaveLength(1);
    expect(wrapper.find(LicenseCallout)).toHaveLength(0);
  });

  it('renders the trial callout', () => {
    setMockValues({ config: { host: 'localhost' } });
    const wrapper = shallow(<OverviewContent {...props} />);

    expect(wrapper.find(TrialCallout)).toHaveLength(1);
  });

  // TODO Refactor this and other tests according to the search indices permissions
  describe('access checks when host is set', () => {
    beforeEach(() => {
      setMockValues({ config: { host: 'localhost' } });
    });

    it('renders the license callout when user has access to a product', () => {
      setMockValues({ config: { host: 'localhost' } });
      const wrapper = shallow(
        <OverviewContent {...props} access={{ hasWorkplaceSearchAccess: true }} />
      );

      expect(wrapper.find(LicenseCallout)).toHaveLength(1);
    });

    it('renders empty prompt and overview or license callout if the user does not have access', () => {
      const wrapper = shallow(<OverviewContent {...props} />);

      expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
      expect(wrapper.find(GettingStartedSteps)).toHaveLength(0);
      expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(0);
      expect(wrapper.find(LicenseCallout)).toHaveLength(0);
      expect(wrapper.find(SetupGuideCta)).toHaveLength(0);
    });
  });
});

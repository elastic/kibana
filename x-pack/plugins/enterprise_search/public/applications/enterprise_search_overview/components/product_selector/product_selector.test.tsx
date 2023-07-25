/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { ErrorStateCallout } from '../../../shared/error_state';

import { ProductCard } from '../product_card';
import { SetupGuideCta } from '../setup_guide';
import { TrialCallout } from '../trial_callout';

import { ProductSelector } from '.';

const props = {
  access: {},
  isWorkplaceSearchAdmin: true,
};

describe('ProductSelector', () => {
  it('renders the overview page, product cards, & setup guide CTAs with no host set', () => {
    setMockValues({ config: { canDeployEntSearch: true, host: '' } });
    const wrapper = shallow(<ProductSelector {...props} />);

    expect(wrapper.find(ProductCard)).toHaveLength(3);
    expect(wrapper.find(SetupGuideCta)).toHaveLength(1);
  });

  it('renders the trial callout', () => {
    setMockValues({ config: { canDeployEntSearch: true, host: 'localhost' } });
    const wrapper = shallow(<ProductSelector {...props} />);

    expect(wrapper.find(TrialCallout)).toHaveLength(1);
  });

  it('passes correct URL when Workplace Search user is not an admin', () => {
    setMockValues({ config: { canDeployEntSearch: true, host: '' } });
    const wrapper = shallow(<ProductSelector {...props} isWorkplaceSearchAdmin={false} />);

    expect(wrapper.find(ProductCard).last().prop('url')).toEqual(
      WORKPLACE_SEARCH_PLUGIN.NON_ADMIN_URL
    );
  });

  it('does not render connection error callout without an error', () => {
    setMockValues({ config: { canDeployEntSearch: true, host: 'localhost' } });
    const wrapper = shallow(<ProductSelector {...props} />);

    expect(wrapper.find(ErrorStateCallout)).toHaveLength(0);
  });

  it('does render connection error callout with an error', () => {
    setMockValues({
      config: { canDeployEntSearch: true, host: 'localhost' },
      errorConnectingMessage: '502 Bad Gateway',
    });
    const wrapper = shallow(<ProductSelector {...props} />);

    expect(wrapper.find(ErrorStateCallout)).toHaveLength(1);
  });

  it('renders add content', () => {
    setMockValues({ config: { canDeployEntSearch: true, host: 'localhost' } });
    const wrapper = shallow(<ProductSelector {...props} />);

    expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(1);
  });

  it('does not render add content when theres a connection error', () => {
    setMockValues({
      config: { canDeployEntSearch: true, host: 'localhost' },
      errorConnectingMessage: '502 Bad Gateway',
    });
    const wrapper = shallow(<ProductSelector {...props} />);

    expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(0);
  });

  describe('access checks when host is set', () => {
    beforeEach(() => {
      setMockValues({ config: { canDeployEntSearch: true, host: 'localhost' } });
    });

    it('does not render the App Search card if the user does not have access to AS', () => {
      const wrapper = shallow(
        <ProductSelector
          {...props}
          access={{ hasAppSearchAccess: false, hasWorkplaceSearchAccess: true }}
        />
      );

      expect(wrapper.find(ProductCard)).toHaveLength(2);
      expect(wrapper.find('[data-test-subj="productCard-workplaceSearch"]')).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="productCard-elasticsearch"]')).toHaveLength(1);
    });

    it('does not render the Workplace Search card if the user does not have access to WS', () => {
      const wrapper = shallow(
        <ProductSelector
          {...props}
          access={{ hasAppSearchAccess: true, hasWorkplaceSearchAccess: false }}
        />
      );

      expect(wrapper.find(ProductCard)).toHaveLength(2);
      expect(wrapper.find('[data-test-subj="productCard-appSearch"]')).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="productCard-elasticsearch"]')).toHaveLength(1);
    });

    it('renders elasticsearch card if the user does not have access app search & workplace search', () => {
      const wrapper = shallow(<ProductSelector {...props} />);

      expect(wrapper.find(ProductCard)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="productCard-elasticsearch"]')).toHaveLength(1);
    });
  });
});

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

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';

import { ElasticsearchCard } from '../elasticsearch_card';
import { LicenseCallout } from '../license_callout';
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
    setMockValues({ config: { host: '' } });
    const wrapper = shallow(<ProductSelector {...props} />);

    expect(wrapper.find(ProductCard)).toHaveLength(2);
    expect(wrapper.find(SetupGuideCta)).toHaveLength(1);
    expect(wrapper.find(LicenseCallout)).toHaveLength(0);
    expect(wrapper.find(ElasticsearchCard)).toHaveLength(1);
  });

  it('renders the trial callout', () => {
    setMockValues({ config: { host: 'localhost' } });
    const wrapper = shallow(<ProductSelector {...props} />);

    expect(wrapper.find(TrialCallout)).toHaveLength(1);
  });

  it('passes correct URL when Workplace Search user is not an admin', () => {
    setMockValues({ config: { host: '' } });
    const wrapper = shallow(<ProductSelector {...props} isWorkplaceSearchAdmin={false} />);

    expect(wrapper.find(ProductCard).last().prop('url')).toEqual(
      WORKPLACE_SEARCH_PLUGIN.NON_ADMIN_URL
    );
  });

  describe('access checks when host is set', () => {
    beforeEach(() => {
      setMockValues({ config: { host: 'localhost' } });
    });

    it('renders the license callout when user has access to a product', () => {
      setMockValues({ config: { host: 'localhost' } });
      const wrapper = shallow(
        <ProductSelector {...props} access={{ hasWorkplaceSearchAccess: true }} />
      );

      expect(wrapper.find(LicenseCallout)).toHaveLength(1);
    });

    it('does not render the App Search card if the user does not have access to AS', () => {
      const wrapper = shallow(
        <ProductSelector
          {...props}
          access={{ hasAppSearchAccess: false, hasWorkplaceSearchAccess: true }}
        />
      );

      expect(wrapper.find(ProductCard)).toHaveLength(1);
      expect(wrapper.find(ProductCard).prop('product').ID).toEqual('workplaceSearch');
    });

    it('does not render the Workplace Search card if the user does not have access to WS', () => {
      const wrapper = shallow(
        <ProductSelector
          {...props}
          access={{ hasAppSearchAccess: true, hasWorkplaceSearchAccess: false }}
        />
      );

      expect(wrapper.find(ProductCard)).toHaveLength(1);
      expect(wrapper.find(ProductCard).prop('product').ID).toEqual('appSearch');
    });

    it('renders empty prompt and no cards or license callout if the user does not have access', () => {
      const wrapper = shallow(<ProductSelector {...props} />);

      expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
      expect(wrapper.find(ProductCard)).toHaveLength(0);
      expect(wrapper.find(LicenseCallout)).toHaveLength(0);
      expect(wrapper.find(ElasticsearchCard)).toHaveLength(0);
    });
  });
});

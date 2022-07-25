/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiHeader, EuiPopover } from '@elastic/eui';

import { AccountHeader } from '.';

describe('AccountHeader', () => {
  const mockValues = {
    account: {
      isAdmin: true,
    },
  };

  beforeEach(() => {
    setMockValues({ ...mockValues });
  });

  it('renders', () => {
    const wrapper = shallow(<AccountHeader />);

    expect(wrapper.find(EuiHeader)).toHaveLength(1);
  });

  describe('accountSubNav', () => {
    it('handles popover trigger click', () => {
      const wrapper = shallow(<AccountHeader />);
      const popover = wrapper.find(EuiPopover);
      const onClick = popover.dive().find('[data-test-subj="AccountButton"]').prop('onClick');
      onClick!({} as any);

      expect(onClick).toBeDefined();
    });

    it('handles close popover', () => {
      const wrapper = shallow(<AccountHeader />);
      const popover = wrapper.find(EuiPopover);
      popover.prop('closePopover')!();

      expect(popover.prop('isOpen')).toEqual(false);
    });
  });
});

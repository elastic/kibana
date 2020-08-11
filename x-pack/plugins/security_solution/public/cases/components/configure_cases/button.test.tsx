/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import { EuiText } from '@elastic/eui';

import '../../../common/mock/match_media';
import { ConfigureCaseButton, ConfigureCaseButtonProps } from './button';
import { TestProviders } from '../../../common/mock';
import { searchURL } from './__mock__';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../common/components/link_to');

describe('Configuration button', () => {
  let wrapper: ReactWrapper;
  const props: ConfigureCaseButtonProps = {
    isDisabled: false,
    label: 'My label',
    msgTooltip: <></>,
    showToolTip: false,
    titleTooltip: '',
    urlSearch: searchURL,
  };

  beforeAll(() => {
    wrapper = mount(<ConfigureCaseButton {...props} />, { wrappingComponent: TestProviders });
  });

  test('it renders without the tooltip', () => {
    expect(wrapper.find('[data-test-subj="configure-case-button"]').first().exists()).toBe(true);

    expect(wrapper.find('[data-test-subj="configure-case-tooltip"]').first().exists()).toBe(false);
  });

  test('it pass the correct props to the button', () => {
    expect(wrapper.find('[data-test-subj="configure-case-button"]').first().props()).toMatchObject({
      href: `/configure`,
      iconType: 'controlsHorizontal',
      isDisabled: false,
      'aria-label': 'My label',
      children: 'My label',
    });
  });

  test('it renders the tooltip', () => {
    const msgTooltip = <EuiText>{'My message tooltip'}</EuiText>;

    const newWrapper = mount(
      <ConfigureCaseButton
        {...props}
        showToolTip={true}
        titleTooltip={'My tooltip title'}
        msgTooltip={msgTooltip}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(newWrapper.find('[data-test-subj="configure-case-tooltip"]').first().exists()).toBe(
      true
    );

    expect(wrapper.find('[data-test-subj="configure-case-button"]').first().exists()).toBe(true);
  });

  test('it shows the tooltip when hovering the button', () => {
    const msgTooltip = 'My message tooltip';
    const titleTooltip = 'My title';

    const newWrapper = mount(
      <ConfigureCaseButton
        {...props}
        showToolTip={true}
        titleTooltip={titleTooltip}
        msgTooltip={<>{msgTooltip}</>}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    newWrapper.find('[data-test-subj="configure-case-button"]').first().simulate('mouseOver');
    // EuiToolTip mounts children after a 250ms delay
    setTimeout(
      () =>
        expect(newWrapper.find('.euiToolTipPopover').text()).toBe(`${titleTooltip}${msgTooltip}`),
      250
    );
  });
});

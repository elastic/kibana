/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiText } from '@elastic/eui';

import '../../common/mock/match_media';
import {
  ConfigureCaseButton,
  ConfigureCaseButtonProps,
  CaseDetailsLink,
  CaseDetailsLinkProps,
} from '.';
import { TestProviders } from '../../common/mock';
import { useCaseViewNavigation } from '../../common/navigation/hooks';

jest.mock('../../common/navigation/hooks');

describe('Configuration button', () => {
  let wrapper: ReactWrapper;
  const props: ConfigureCaseButtonProps = {
    isDisabled: false,
    label: 'My label',
    msgTooltip: <></>,
    showToolTip: false,
    titleTooltip: '',
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
      href: `/app/security/cases/configure`,
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
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers();

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

    // Run the timers so the EuiTooltip will be visible
    jest.runAllTimers();

    newWrapper.update();
    expect(newWrapper.find('.euiToolTipPopover').text()).toBe(`${titleTooltip}${msgTooltip}`);

    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });
});

describe('CaseDetailsLink', () => {
  const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
  const getCaseViewUrl = jest.fn().mockReturnValue('/cases/test');
  const navigateToCaseView = jest.fn();

  const props: CaseDetailsLinkProps = {
    detailName: 'test detail name',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewNavigationMock.mockReturnValue({ getCaseViewUrl, navigateToCaseView });
  });

  test('it renders', () => {
    render(<CaseDetailsLink {...props} />);
    expect(screen.getByText('test detail name')).toBeInTheDocument();
  });

  test('it renders the children instead of the detail name if provided', () => {
    render(<CaseDetailsLink {...props}>{'children'}</CaseDetailsLink>);
    expect(screen.queryByText('test detail name')).toBeFalsy();
    expect(screen.getByText('children')).toBeInTheDocument();
  });

  test('it uses the detailName in the aria-label if the title is not provided', () => {
    render(<CaseDetailsLink {...props} />);
    expect(
      screen.getByLabelText(`click to visit case with title ${props.detailName}`)
    ).toBeInTheDocument();
  });

  test('it uses the title in the aria-label if provided', () => {
    render(<CaseDetailsLink {...props} title={'my title'} />);
    expect(screen.getByText('test detail name')).toBeInTheDocument();
    expect(screen.getByLabelText(`click to visit case with title my title`)).toBeInTheDocument();
  });

  test('it calls navigateToCaseViewClick on click', () => {
    render(<CaseDetailsLink {...props} />);
    userEvent.click(screen.getByText('test detail name'));
    expect(navigateToCaseView).toHaveBeenCalledWith({
      detailName: props.detailName,
    });
  });

  test('it set the href correctly', () => {
    render(<CaseDetailsLink {...props} />);
    expect(getCaseViewUrl).toHaveBeenCalledWith({
      detailName: props.detailName,
    });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/cases/test');
  });
});

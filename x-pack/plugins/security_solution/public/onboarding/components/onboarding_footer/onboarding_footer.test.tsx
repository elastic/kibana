/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { trackOnboardingLinkClick } from '../../common/lib/telemetry';
import { FooterLinkItem } from './onboarding_footer';
import { OnboardingFooterLinkItemId, TELEMETRY_FOOTER_LINK } from './constants';

jest.mock('../../common/lib/telemetry');

describe('OnboardingFooterComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('FooterLinkItems should render the title and description', () => {
    const { getByText } = render(
      <FooterLinkItem
        id={OnboardingFooterLinkItemId.documentation}
        icon={'mockIcon.png'}
        title={'Mock Title'}
        description={'Mock Description'}
        link={{ title: 'test', href: 'www.mock.com' }}
      />
    );

    expect(getByText('Mock Title')).toBeInTheDocument();
    expect(getByText('Mock Description')).toBeInTheDocument();
  });

  it('FooterLinkItems should track the link click', () => {
    const { getByTestId } = render(
      <FooterLinkItem
        id={OnboardingFooterLinkItemId.documentation}
        icon={'mockIcon.png'}
        title={'Mock Title'}
        description={'Mock Description'}
        link={{ title: 'test', href: 'www.mock.com' }}
      />
    );

    getByTestId('footerLinkItem').click();
    expect(trackOnboardingLinkClick).toHaveBeenCalledWith(
      `${TELEMETRY_FOOTER_LINK}_${OnboardingFooterLinkItemId.documentation}`
    );
  });
});

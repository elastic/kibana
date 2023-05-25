/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { BETA } from '@kbn/kubernetes-security-plugin/common/translations';
import { SecurityPageName } from '../../../app/types';
import type { NavLinkItem } from '../navigation/types';
import { TestProviders } from '../../mock';
import { LandingLinksImages, LandingImageCards } from './landing_links_images';
import * as telemetry from '../../lib/telemetry';

const DEFAULT_NAV_ITEM: NavLinkItem = {
  id: SecurityPageName.overview,
  title: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  image: 'TEST_IMAGE.png',
};

const BETA_NAV_ITEM: NavLinkItem = {
  id: SecurityPageName.kubernetes,
  title: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  image: 'TEST_IMAGE.png',
  isBeta: true,
};

jest.mock('../../lib/kibana/kibana_react', () => {
  return {
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          getUrlForApp: jest.fn(),
          navigateToApp: jest.fn(),
          navigateToUrl: jest.fn(),
        },
      },
    }),
  };
});

const spyTrack = jest.spyOn(telemetry, 'track');

describe('LandingLinksImages', () => {
  it('renders', () => {
    const title = 'test label';

    const { queryByText } = render(
      <TestProviders>
        <LandingLinksImages items={[{ ...DEFAULT_NAV_ITEM, title }]} />
      </TestProviders>
    );

    expect(queryByText(title)).toBeInTheDocument();
  });

  it('renders image', () => {
    const image = 'test_image.jpeg';
    const title = 'TEST_LABEL';

    const { getByTestId } = render(
      <TestProviders>
        <LandingLinksImages items={[{ ...DEFAULT_NAV_ITEM, image, title }]} />
      </TestProviders>
    );

    expect(getByTestId('LandingLinksImage')).toHaveAttribute('src', image);
  });

  it('renders beta tag when isBeta is true', () => {
    const { queryByText } = render(
      <TestProviders>
        <LandingLinksImages items={[BETA_NAV_ITEM]} />
      </TestProviders>
    );

    expect(queryByText(BETA)).toBeInTheDocument();
  });

  it('does not render beta tag when isBeta is false', () => {
    const { queryByText } = render(
      <TestProviders>
        <LandingLinksImages items={[DEFAULT_NAV_ITEM]} />
      </TestProviders>
    );

    expect(queryByText(BETA)).not.toBeInTheDocument();
  });
});

describe('LandingImageCards', () => {
  it('renders', () => {
    const title = 'test label';

    const { queryByText } = render(
      <TestProviders>
        <LandingImageCards items={[{ ...DEFAULT_NAV_ITEM, title }]} />
      </TestProviders>
    );

    expect(queryByText(title)).toBeInTheDocument();
  });

  it('renders image', () => {
    const image = 'test_image.jpeg';
    const title = 'TEST_LABEL';

    const { getByTestId } = render(
      <TestProviders>
        <LandingImageCards items={[{ ...DEFAULT_NAV_ITEM, image, title }]} />
      </TestProviders>
    );

    expect(getByTestId('LandingImageCard-image')).toHaveAttribute('src', image);
  });

  it('sends telemetry', () => {
    const image = 'test_image.jpeg';
    const title = 'TEST LABEL';

    const { getByText } = render(
      <TestProviders>
        <LandingImageCards items={[{ ...DEFAULT_NAV_ITEM, image, title }]} />
      </TestProviders>
    );

    getByText(title).click();

    expect(spyTrack).toHaveBeenCalledWith(
      telemetry.METRIC_TYPE.CLICK,
      `${telemetry.TELEMETRY_EVENT.LANDING_CARD}${DEFAULT_NAV_ITEM.id}`
    );
  });

  it('renders beta tag when isBeta is true', () => {
    const { queryByText } = render(
      <TestProviders>
        <LandingImageCards items={[BETA_NAV_ITEM]} />
      </TestProviders>
    );

    expect(queryByText(BETA)).toBeInTheDocument();
  });

  it('does not render beta tag when isBeta is false', () => {
    const { queryByText } = render(
      <TestProviders>
        <LandingImageCards items={[DEFAULT_NAV_ITEM]} />
      </TestProviders>
    );

    expect(queryByText(BETA)).not.toBeInTheDocument();
  });
});

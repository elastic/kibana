/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { SecurityPageName } from '../../../app/types';
import type { NavLinkItem } from '../navigation/types';
import { TestProviders } from '../../mock';
import { LandingLinksIcons } from './landing_links_icons';
import * as telemetry from '../../lib/telemetry';

const DEFAULT_NAV_ITEM: NavLinkItem = {
  id: SecurityPageName.overview,
  title: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  icon: 'myTestIcon',
};
const spyTrack = jest.spyOn(telemetry, 'track');

const mockNavigateTo = jest.fn();
jest.mock('../../lib/kibana', () => {
  const originalModule = jest.requireActual('../../lib/kibana');
  return {
    ...originalModule,
    useNavigateTo: () => ({
      navigateTo: mockNavigateTo,
    }),
  };
});

jest.mock('../link_to', () => {
  const originalModule = jest.requireActual('../link_to');
  return {
    ...originalModule,
    useGetSecuritySolutionUrl: () =>
      jest.fn(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`),
  };
});

describe('LandingLinksIcons', () => {
  it('renders', () => {
    const title = 'test label';

    const { queryByText } = render(
      <TestProviders>
        <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, title }]} />
      </TestProviders>
    );

    expect(queryByText(title)).toBeInTheDocument();
  });

  it('renders navigation link', () => {
    const id = SecurityPageName.administration;
    const title = 'myTestLable';

    const { getByText } = render(
      <TestProviders>
        <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, id, title }]} />
      </TestProviders>
    );

    getByText(title).click();

    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/administration' });
  });

  it('sends telemetry', () => {
    const id = SecurityPageName.administration;
    const title = 'myTestLable';

    const { getByText } = render(
      <TestProviders>
        <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, id, title }]} />
      </TestProviders>
    );

    getByText(title).click();

    expect(spyTrack).toHaveBeenCalledWith(
      telemetry.METRIC_TYPE.CLICK,
      `${telemetry.TELEMETRY_EVENT.LANDING_CARD}${id}`
    );
  });
});

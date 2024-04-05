/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';

import { useStartServices } from '../../../hooks';

import type { PackageCardProps } from './package_card';
import { PackageCard } from './package_card';

jest.mock('../../../hooks', () => {
  return {
    ...jest.requireActual('../../../hooks'),
    useConfirmForceInstall: jest.fn(),
    useStartServices: jest.fn().mockReturnValue({
      application: {
        navigateToApp: jest.fn(),
        navigateToUrl: jest.fn(),
      },
    }),
    useIsGuidedOnboardingActive: jest.fn().mockReturnValue(false),
  };
});

jest.mock('../../../components', () => {
  return {
    ...jest.requireActual('../../../components'),
    WithGuidedOnboardingTour: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

function renderPackageCard(props: PackageCardProps) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(<PackageCard {...props} />);

  return { utils };
}

describe('package card', () => {
  let mockNavigateToApp: jest.Mock;
  let mockNavigateToUrl: jest.Mock;

  beforeEach(() => {
    mockNavigateToApp = useStartServices().application.navigateToApp as jest.Mock;
    mockNavigateToUrl = useStartServices().application.navigateToUrl as jest.Mock;
  });

  it('should navigate with state when integrations card', async () => {
    const { utils } = renderPackageCard({
      id: 'card-1',
      url: '/app/integrations/detail/apache-1.0/overview',
      fromIntegrations: 'installed',
      title: 'System',
      description: 'System',
    } as PackageCardProps);

    await act(async () => {
      const el = utils.getByRole('button');
      fireEvent.click(el!, {});
    });
    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/detail/apache-1.0/overview',
      state: { fromIntegrations: 'installed' },
    });
  });

  it('should navigate with url when enterprise search card', async () => {
    const { utils } = renderPackageCard({
      id: 'card-1',
      url: '/app/enterprise_search/workplace_search/setup_guide',
      fromIntegrations: 'installed',
      title: 'System',
      description: 'System',
    } as PackageCardProps);

    await act(async () => {
      const el = utils.getByRole('button');
      fireEvent.click(el!, {});
    });
    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/app/enterprise_search/workplace_search/setup_guide'
    );
  });

  it('should navigate with window open when external url', async () => {
    window.open = jest.fn();

    const { utils } = renderPackageCard({
      id: 'card-1',
      url: 'https://google.com',
      fromIntegrations: 'installed',
      title: 'System',
      description: 'System',
    } as PackageCardProps);

    await act(async () => {
      const el = utils.getByRole('button');
      fireEvent.click(el!, {});
    });
    expect(window.open).toHaveBeenCalledWith('https://google.com', '_blank');
  });

  it.each([true, false])(
    'renders card with a badge when quickstart flag is enabled',
    async (isQuickstart) => {
      const {
        utils: { queryByTitle },
      } = renderPackageCard({
        id: 'card-1',
        url: 'https://google.com',
        fromIntegrations: 'installed',
        title: 'System',
        description: 'System',
        isQuickstart,
      } as PackageCardProps);
      const badgeElement = await queryByTitle('Quickstart');
      expect(!!badgeElement).toEqual(isQuickstart);
    }
  );
});

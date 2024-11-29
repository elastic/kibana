/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertsBadge } from './alerts_badge';
import { useKibana } from '../../hooks/use_kibana';
import type { InventoryEntity } from '../../../common/entities';

jest.mock('../../hooks/use_kibana');
const useKibanaMock = useKibana as jest.Mock;

const commonEntityFields: Partial<InventoryEntity> = {
  entityLastSeenTimestamp: 'foo',
  entityId: 'entity1',
};

describe('AlertsBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        http: {
          basePath: {
            prepend: (path: string) => path,
          },
        },
      },
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('render alerts badge for a host entity', () => {
    const entity: InventoryEntity = {
      ...(commonEntityFields as InventoryEntity),
      entityType: 'host',
      entityDisplayName: 'foo',
      entityIdentityFields: 'host.name',
      entityDefinitionId: 'host',
      alertsCount: 1,
      host: {
        name: 'foo',
      },
      cloud: {
        provider: null,
      },
    };

    render(<AlertsBadge entity={entity} />);
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.getAttribute('href')).toEqual(
      `/app/observability/alerts?_a=(kuery:\"entity1\",status:active)`
    );
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.textContent).toEqual('1');
  });
  it('render alerts badge for a service entity', () => {
    const entity: InventoryEntity = {
      ...(commonEntityFields as InventoryEntity),
      entityType: 'service',
      entityDisplayName: 'foo',
      entityIdentityFields: 'service.name',
      entityDefinitionId: 'service',
      service: {
        name: 'bar',
      },
      agent: {
        name: 'node',
      },
      cloud: {
        provider: null,
      },

      alertsCount: 5,
    };

    render(<AlertsBadge entity={entity} />);
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.getAttribute('href')).toEqual(
      `/app/observability/alerts?_a=(kuery:\"entity1\",status:active)`
    );
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.textContent).toEqual('5');
  });
});

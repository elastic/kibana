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
import type { Entity } from '../../../common/entities';

jest.mock('../../hooks/use_kibana');
const useKibanaMock = useKibana as jest.Mock;

describe('AlertsBadge', () => {
  const mockAsKqlFilter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        http: {
          basePath: {
            prepend: (path: string) => path,
          },
        },
        entityManager: {
          entityClient: {
            asKqlFilter: mockAsKqlFilter,
          },
        },
      },
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('render alerts badge for a host entity', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'entity.id': '1',
      'entity.type': 'host',
      'entity.display_name': 'foo',
      'entity.identity_fields': 'host.name',
      'host.name': 'foo',
      'entity.definition_id': 'host',
      'cloud.provider': null,
      alertsCount: 1,
    };
    mockAsKqlFilter.mockReturnValue('host.name: foo');

    render(<AlertsBadge entity={entity} />);
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.getAttribute('href')).toEqual(
      "/app/observability/alerts?_a=(kuery:'host.name: foo',status:active)"
    );
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.textContent).toEqual('1');
  });
  it('render alerts badge for a service entity', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'agent.name': 'node',
      'entity.id': '1',
      'entity.type': 'service',
      'entity.display_name': 'foo',
      'entity.identity_fields': 'service.name',
      'service.name': 'bar',
      'entity.definition_id': 'host',
      'cloud.provider': null,
      alertsCount: 5,
    };
    mockAsKqlFilter.mockReturnValue('service.name: bar');

    render(<AlertsBadge entity={entity} />);
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.getAttribute('href')).toEqual(
      "/app/observability/alerts?_a=(kuery:'service.name: bar',status:active)"
    );
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.textContent).toEqual('5');
  });
  it('render alerts badge for a service entity with multiple identity fields', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'agent.name': 'node',
      'entity.id': '1',
      'entity.type': 'service',
      'entity.display_name': 'foo',
      'entity.identity_fields': ['service.name', 'service.environment'],
      'service.name': 'bar',
      'service.environment': 'prod',
      'entity.definition_id': 'host',
      'cloud.provider': null,
      alertsCount: 2,
    };

    mockAsKqlFilter.mockReturnValue('service.name: bar AND service.environment: prod');

    render(<AlertsBadge entity={entity} />);
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.getAttribute('href')).toEqual(
      "/app/observability/alerts?_a=(kuery:'service.name: bar AND service.environment: prod',status:active)"
    );
    expect(screen.queryByTestId('inventoryAlertsBadgeLink')?.textContent).toEqual('2');
  });
});

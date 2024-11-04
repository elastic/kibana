/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import * as useKibana from '../../../hooks/use_kibana';
import { EntityName } from '.';
import type { Entity } from '../../../../common/entities';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ASSET_DETAILS_LOCATOR_ID } from '@kbn/observability-shared-plugin/common/locators/infra/asset_details_locator';

describe('EntityName', () => {
  jest.spyOn(useKibana, 'useKibana').mockReturnValue({
    services: {
      share: {
        url: {
          locators: {
            get: (locatorId: string) => {
              return {
                getRedirectUrl: (params: { [key: string]: any }) => {
                  if (locatorId === ASSET_DETAILS_LOCATOR_ID) {
                    return `assets_url/${params.assetType}/${params.assetId}`;
                  }
                  return `services_url/${params.serviceName}?environment=${params.environment}`;
                },
              };
            },
          },
        },
      },
    },
  } as unknown as KibanaReactContextValue<useKibana.InventoryKibanaContext>);

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('returns host link', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'entity.id': '1',
      'entity.type': 'host',
      'entity.display_name': 'foo',
      'entity.identity_fields': 'host.name',
      'host.name': 'foo',
      'entity.definition_id': 'host',
      'cloud.provider': null,
    };
    render(<EntityName entity={entity} />);
    expect(screen.queryByTestId('entityNameLink')?.getAttribute('href')).toEqual(
      'assets_url/host/foo'
    );
    expect(screen.queryByTestId('entityNameDisplayName')?.textContent).toEqual('foo');
  });

  it('returns container link', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'entity.id': '1',
      'entity.type': 'container',
      'entity.display_name': 'foo',
      'entity.identity_fields': 'container.id',
      'container.id': 'foo',
      'entity.definition_id': 'container',
      'cloud.provider': null,
    };
    render(<EntityName entity={entity} />);
    expect(screen.queryByTestId('entityNameLink')?.getAttribute('href')).toEqual(
      'assets_url/container/foo'
    );
    expect(screen.queryByTestId('entityNameDisplayName')?.textContent).toEqual('foo');
  });

  it('returns service link without environment', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'entity.id': '1',
      'entity.type': 'service',
      'entity.display_name': 'foo',
      'entity.identity_fields': 'service.name',
      'service.name': 'foo',
      'entity.definition_id': 'service',
      'agent.name': 'bar',
    };
    render(<EntityName entity={entity} />);
    expect(screen.queryByTestId('entityNameLink')?.getAttribute('href')).toEqual(
      'services_url/foo?environment=undefined'
    );
    expect(screen.queryByTestId('entityNameDisplayName')?.textContent).toEqual('foo');
  });

  it('returns service link with environment', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'entity.id': '1',
      'entity.type': 'service',
      'entity.display_name': 'foo',
      'entity.identity_fields': 'service.name',
      'service.name': 'foo',
      'entity.definition_id': 'service',
      'agent.name': 'bar',
      'service.environment': 'baz',
    };
    render(<EntityName entity={entity} />);
    expect(screen.queryByTestId('entityNameLink')?.getAttribute('href')).toEqual(
      'services_url/foo?environment=baz'
    );
    expect(screen.queryByTestId('entityNameDisplayName')?.textContent).toEqual('foo');
  });

  it('returns service link with first environment when it is an array', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'entity.id': '1',
      'entity.type': 'service',
      'entity.display_name': 'foo',
      'entity.identity_fields': 'service.name',
      'service.name': 'foo',
      'entity.definition_id': 'service',
      'agent.name': 'bar',
      'service.environment': ['baz', 'bar', 'foo'],
    };
    render(<EntityName entity={entity} />);
    expect(screen.queryByTestId('entityNameLink')?.getAttribute('href')).toEqual(
      'services_url/foo?environment=baz'
    );
    expect(screen.queryByTestId('entityNameDisplayName')?.textContent).toEqual('foo');
  });

  it('returns service link identity fields is an array', () => {
    const entity: Entity = {
      'entity.last_seen_timestamp': 'foo',
      'entity.id': '1',
      'entity.type': 'service',
      'entity.display_name': 'foo',
      'entity.identity_fields': ['service.name', 'service.environment'],
      'service.name': 'foo',
      'entity.definition_id': 'service',
      'agent.name': 'bar',
      'service.environment': 'baz',
    };
    render(<EntityName entity={entity} />);
    expect(screen.queryByTestId('entityNameLink')?.getAttribute('href')).toEqual(
      'services_url/foo?environment=baz'
    );
    expect(screen.queryByTestId('entityNameDisplayName')?.textContent).toEqual('foo');
  });
});

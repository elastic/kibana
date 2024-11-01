/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useDetailViewRedirect } from './use_detail_view_redirect';
import { useKibana } from './use_kibana';
import {
  AGENT_NAME,
  CLOUD_PROVIDER,
  CONTAINER_ID,
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_ID,
  ENTITY_IDENTITY_FIELDS,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
  HOST_NAME,
  ENTITY_TYPES,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '@kbn/observability-shared-plugin/common';
import { unflattenEntity } from '../../common/utils/unflatten_entity';
import type { Entity } from '../../common/entities';

jest.mock('./use_kibana');
jest.mock('../../common/utils/unflatten_entity');

const useKibanaMock = useKibana as jest.Mock;
const unflattenEntityMock = unflattenEntity as jest.Mock;

const commonEntityFields: Partial<Entity> = {
  [ENTITY_LAST_SEEN]: '2023-10-09T00:00:00Z',
  [ENTITY_ID]: '1',
  [ENTITY_DISPLAY_NAME]: 'entity_name',
  [ENTITY_DEFINITION_ID]: 'entity_definition_id',
};

describe('useDetailViewRedirect', () => {
  const mockGetIdentityFieldsValue = jest.fn();
  const mockAsKqlFilter = jest.fn();
  const mockGetRedirectUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: jest.fn().mockReturnValue({
                getRedirectUrl: mockGetRedirectUrl,
              }),
            },
          },
        },
        entityManager: {
          entityClient: {
            getIdentityFieldsValue: mockGetIdentityFieldsValue,
            asKqlFilter: mockAsKqlFilter,
          },
        },
      },
    });

    unflattenEntityMock.mockImplementation((entity) => entity);
  });

  it('getEntityRedirectUrl should return the correct URL for host entity', () => {
    const entity: Entity = {
      ...(commonEntityFields as Entity),
      [ENTITY_IDENTITY_FIELDS]: [HOST_NAME],
      [ENTITY_TYPE]: 'host',
      [HOST_NAME]: 'host-1',
      [CLOUD_PROVIDER]: null,
    };

    mockGetIdentityFieldsValue.mockReturnValue({ [HOST_NAME]: 'host-1' });
    mockGetRedirectUrl.mockReturnValue('asset-details-url');

    const { result } = renderHook(() => useDetailViewRedirect());
    const url = result.current.getEntityRedirectUrl(entity);

    expect(url).toBe('asset-details-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ assetId: 'host-1', assetType: 'host' });
  });

  it('getEntityRedirectUrl should return the correct URL for container entity', () => {
    const entity: Entity = {
      ...(commonEntityFields as Entity),
      [ENTITY_IDENTITY_FIELDS]: [CONTAINER_ID],
      [ENTITY_TYPE]: 'container',
      [CONTAINER_ID]: 'container-1',
      [CLOUD_PROVIDER]: null,
    };

    mockGetIdentityFieldsValue.mockReturnValue({ [CONTAINER_ID]: 'container-1' });
    mockGetRedirectUrl.mockReturnValue('asset-details-url');

    const { result } = renderHook(() => useDetailViewRedirect());
    const url = result.current.getEntityRedirectUrl(entity);

    expect(url).toBe('asset-details-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      assetId: 'container-1',
      assetType: 'container',
    });
  });

  it('getEntityRedirectUrl should return the correct URL for service entity', () => {
    const entity: Entity = {
      ...(commonEntityFields as Entity),
      [ENTITY_IDENTITY_FIELDS]: [SERVICE_NAME],
      [ENTITY_TYPE]: 'service',
      [SERVICE_NAME]: 'service-1',
      [SERVICE_ENVIRONMENT]: 'prod',
      [AGENT_NAME]: 'node',
    };
    mockGetIdentityFieldsValue.mockReturnValue({ [SERVICE_NAME]: 'service-1' });
    mockGetRedirectUrl.mockReturnValue('service-overview-url');

    const { result } = renderHook(() => useDetailViewRedirect());
    const url = result.current.getEntityRedirectUrl(entity);

    expect(url).toBe('service-overview-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'service-1',
      environment: 'prod',
    });
  });

  [
    [ENTITY_TYPES.KUBERNETES.CLUSTER.ecs, 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c'],
    [ENTITY_TYPES.KUBERNETES.CLUSTER.semconv, 'kubernetes_otel-cluster-overview'],
    [ENTITY_TYPES.KUBERNETES.CRONJOB.ecs, 'kubernetes-0a672d50-bcb1-11ec-b64f-7dd6e8e82013'],
    [ENTITY_TYPES.KUBERNETES.DAEMONSET.ecs, 'kubernetes-85879010-bcb1-11ec-b64f-7dd6e8e82013'],
    [ENTITY_TYPES.KUBERNETES.DEPLOYMENT.ecs, 'kubernetes-5be46210-bcb1-11ec-b64f-7dd6e8e82013'],
    [ENTITY_TYPES.KUBERNETES.JOB.ecs, 'kubernetes-9bf990a0-bcb1-11ec-b64f-7dd6e8e82013'],
    [ENTITY_TYPES.KUBERNETES.NODE.ecs, 'kubernetes-b945b7b0-bcb1-11ec-b64f-7dd6e8e82013'],
    [ENTITY_TYPES.KUBERNETES.POD.ecs, 'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013'],
    [ENTITY_TYPES.KUBERNETES.STATEFULSET.ecs, 'kubernetes-21694370-bcb2-11ec-b64f-7dd6e8e82013'],
  ].forEach(([entityType, dashboardId]) => {
    it(`getEntityRedirectUrl should return the correct URL for ${entityType} entity`, () => {
      const entity: Entity = {
        ...(commonEntityFields as Entity),
        [ENTITY_IDENTITY_FIELDS]: ['some.field'],
        [ENTITY_TYPE]: entityType,
      };

      mockAsKqlFilter.mockReturnValue('kql-query');
      mockGetRedirectUrl.mockReturnValue('dashboard-url');

      const { result } = renderHook(() => useDetailViewRedirect());
      const url = result.current.getEntityRedirectUrl(entity);

      expect(url).toBe('dashboard-url');
      expect(mockGetRedirectUrl).toHaveBeenCalledWith({
        dashboardId,
        query: {
          language: 'kuery',
          query: 'kql-query',
        },
      });
    });
  });
});

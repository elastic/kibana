/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./get_assets', () => ({ getAssets: jest.fn() }));

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { v4 as uuid } from 'uuid';
import { AssetWithoutTimestamp } from '../../common/types_api';
import { getAssets } from './get_assets'; // Mocked
import { getAllRelatedAssets } from './get_all_related_assets';

const esClientMock = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

describe('getAllRelatedAssets', () => {
  it('returns only the primary if it does not have any ancestors', async () => {
    const primaryAssetWithoutParents: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.id': uuid(),
      'asset.parents': [],
    };

    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAssetWithoutParents]);
    (getAssets as jest.Mock).mockResolvedValueOnce([]);

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAssetWithoutParents['asset.ean'],
        from: new Date().toISOString(),
        relation: 'ancestors',
        maxDistance: 1,
        size: 10,
      })
    ).resolves.toStrictEqual({
      primary: primaryAssetWithoutParents,
      ancestors: [],
    });
  });

  it('returns the primary and a directly referenced parent', async () => {
    const parentAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.id': uuid(),
    };

    const primaryAssetWithDirectParent: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.id': uuid(),
      'asset.parents': [parentAsset['asset.ean']],
    };

    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAssetWithDirectParent]);
    (getAssets as jest.Mock).mockResolvedValueOnce([parentAsset]);

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAssetWithDirectParent['asset.ean'],
        from: new Date().toISOString(),
        relation: 'ancestors',
        maxDistance: 1,
        size: 10,
      })
    ).resolves.toStrictEqual({
      primary: primaryAssetWithDirectParent,
      ancestors: [
        {
          ...parentAsset,
          distance: 1,
        },
      ],
    });
  });

  it('returns the primary and a not directly referenced parent', async () => {
    const primaryAssetWithIndirectParent: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.id': uuid(),
      'asset.parents': [],
    };

    const parentAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.id': uuid(),
      'asset.children': [primaryAssetWithIndirectParent['asset.ean']],
    };

    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAssetWithIndirectParent]);
    (getAssets as jest.Mock).mockResolvedValueOnce([]);

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAssetWithIndirectParent['asset.ean'],
        from: new Date().toISOString(),
        relation: 'ancestors',
        maxDistance: 1,
        size: 10,
      })
    ).resolves.toStrictEqual({
      primary: primaryAssetWithIndirectParent,
      ancestors: [
        {
          ...parentAsset,
          distance: 1,
        },
      ],
    });
  });
});

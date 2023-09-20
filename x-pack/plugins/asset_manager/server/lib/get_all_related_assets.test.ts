/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./get_assets', () => ({ getAssets: jest.fn() }));
jest.mock('./get_indirectly_related_assets', () => ({ getIndirectlyRelatedAssets: jest.fn() }));

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { v4 as uuid } from 'uuid';
import { AssetWithoutTimestamp } from '../../common/types_api';
import { getAssets } from './get_assets'; // Mocked
import { getIndirectlyRelatedAssets } from './get_indirectly_related_assets'; // Mocked
import { getAllRelatedAssets } from './get_all_related_assets';

const esClientMock = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

describe('getAllRelatedAssets', () => {
  beforeEach(() => {
    (getAssets as jest.Mock).mockReset();
    (getIndirectlyRelatedAssets as jest.Mock).mockReset();
  });

  it('throws if it cannot find the primary asset', async () => {
    const primaryAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-which-does-not-exist',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    // Mock that we cannot find the primary
    (getAssets as jest.Mock).mockResolvedValueOnce([]);
    // Ensure maxDistance is respected
    (getAssets as jest.Mock).mockRejectedValueOnce(new Error('Should respect maxDistance'));
    (getIndirectlyRelatedAssets as jest.Mock).mockRejectedValueOnce(
      new Error('Should respect maxDistance')
    );

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAsset['asset.ean'],
        relation: 'ancestors',
        from: new Date().toISOString(),
        maxDistance: 1,
        size: 10,
      })
    ).rejects.toThrow(
      `Asset with ean (${primaryAsset['asset.ean']}) not found in the provided time range`
    );
  });

  it('returns only the primary if it does not have any ancestors', async () => {
    const primaryAssetWithoutParents: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [],
    };

    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAssetWithoutParents]);
    // Distance 1
    (getIndirectlyRelatedAssets as jest.Mock).mockResolvedValueOnce([]);
    // Ensure maxDistance is respected
    (getAssets as jest.Mock).mockRejectedValueOnce(new Error('Should respect maxDistance'));
    (getIndirectlyRelatedAssets as jest.Mock).mockRejectedValueOnce(
      new Error('Should respect maxDistance')
    );

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
      'asset.ean': 'parent-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    const primaryAssetWithDirectParent: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [parentAsset['asset.ean']],
    };

    // Primary
    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAssetWithDirectParent]);
    // Distance 1
    (getAssets as jest.Mock).mockResolvedValueOnce([parentAsset]);
    (getIndirectlyRelatedAssets as jest.Mock).mockResolvedValueOnce([]);
    // Ensure maxDistance is respected
    (getAssets as jest.Mock).mockRejectedValueOnce(new Error('Should respect maxDistance'));
    (getIndirectlyRelatedAssets as jest.Mock).mockRejectedValueOnce(
      new Error('Should respect maxDistance')
    );

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

  it('returns the primary and an indirectly referenced parent', async () => {
    const primaryAssetWithIndirectParent: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [],
    };

    const parentAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.children': [primaryAssetWithIndirectParent['asset.ean']],
    };

    // Primary
    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAssetWithIndirectParent]);
    // Distance 1
    (getAssets as jest.Mock).mockResolvedValueOnce([]);
    (getIndirectlyRelatedAssets as jest.Mock).mockResolvedValueOnce([parentAsset]);
    // Ensure maxDistance is respected
    (getAssets as jest.Mock).mockRejectedValueOnce(new Error('Should respect maxDistance'));
    (getIndirectlyRelatedAssets as jest.Mock).mockRejectedValueOnce(
      new Error('Should respect maxDistance')
    );

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

  it('returns the primary and all distance 1 parents', async () => {
    const directlyReferencedParent: AssetWithoutTimestamp = {
      'asset.ean': 'directly-referenced-parent-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.children': [],
    };

    const primaryAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [directlyReferencedParent['asset.ean']],
    };

    const indirectlyReferencedParent: AssetWithoutTimestamp = {
      'asset.ean': 'indirectly-referenced-parent-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.children': [primaryAsset['asset.ean']],
    };

    // Primary
    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAsset]);
    // Distance 1
    (getAssets as jest.Mock).mockResolvedValueOnce([directlyReferencedParent]);
    (getIndirectlyRelatedAssets as jest.Mock).mockResolvedValueOnce([indirectlyReferencedParent]);
    // Ensure maxDistance is respected
    (getAssets as jest.Mock).mockRejectedValueOnce(new Error('Should respect maxDistance'));
    (getIndirectlyRelatedAssets as jest.Mock).mockRejectedValueOnce(
      new Error('Should respect maxDistance')
    );

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAsset['asset.ean'],
        from: new Date().toISOString(),
        relation: 'ancestors',
        maxDistance: 1,
        size: 10,
      })
    ).resolves.toStrictEqual({
      primary: primaryAsset,
      ancestors: [
        {
          ...directlyReferencedParent,
          distance: 1,
        },
        {
          ...indirectlyReferencedParent,
          distance: 1,
        },
      ],
    });
  });

  it('returns the primary and one parent even with a two way relation defined', async () => {
    const parentAsset: AssetWithoutTimestamp = {
      'asset.ean': 'parent-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    const primaryAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    primaryAsset['asset.parents'] = [parentAsset['asset.ean']];
    parentAsset['asset.children'] = [primaryAsset['asset.ean']];

    // Primary
    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAsset]);
    // Distance 1
    (getAssets as jest.Mock).mockResolvedValueOnce([parentAsset]);
    // Code should filter out any directly referenced parent from the indirectly referenced parents query
    (getIndirectlyRelatedAssets as jest.Mock).mockResolvedValueOnce([]);
    // Ensure maxDistance is respected
    (getAssets as jest.Mock).mockRejectedValueOnce(new Error('Should respect maxDistance'));
    (getIndirectlyRelatedAssets as jest.Mock).mockRejectedValueOnce(
      new Error('Should respect maxDistance')
    );

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAsset['asset.ean'],
        from: new Date().toISOString(),
        relation: 'ancestors',
        maxDistance: 1,
        size: 10,
      })
    ).resolves.toStrictEqual({
      primary: primaryAsset,
      ancestors: [
        {
          ...parentAsset,
          distance: 1,
        },
      ],
    });
  });

  it('returns relations from 5 jumps', async () => {
    const distance6Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-5-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    const distance5Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-5-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance6Parent['asset.ean']],
    };

    const distance4Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-4-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance5Parent['asset.ean']],
    };

    const distance3Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-3-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance4Parent['asset.ean']],
    };

    const distance2Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-2-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance3Parent['asset.ean']],
    };

    const distance1Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-1-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance2Parent['asset.ean']],
    };

    const primaryAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance1Parent['asset.ean']],
    };

    // Only using directly referenced parents
    (getIndirectlyRelatedAssets as jest.Mock).mockResolvedValue([]);

    // Primary
    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAsset]);
    // Distance 1
    (getAssets as jest.Mock).mockResolvedValueOnce([distance1Parent]);
    // Distance 2
    (getAssets as jest.Mock).mockResolvedValueOnce([distance2Parent]);
    // Distance 3
    (getAssets as jest.Mock).mockResolvedValueOnce([distance3Parent]);
    // Distance 4
    (getAssets as jest.Mock).mockResolvedValueOnce([distance4Parent]);
    // Distance 5
    (getAssets as jest.Mock).mockResolvedValueOnce([distance5Parent]);
    // Should not exceed maxDistance
    (getAssets as jest.Mock).mockRejectedValueOnce(new Error('Should respect maxDistance'));

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAsset['asset.ean'],
        from: new Date().toISOString(),
        relation: 'ancestors',
        maxDistance: 5,
        size: 10,
      })
    ).resolves.toStrictEqual({
      primary: primaryAsset,
      ancestors: [
        {
          ...distance1Parent,
          distance: 1,
        },
        {
          ...distance2Parent,
          distance: 2,
        },
        {
          ...distance3Parent,
          distance: 3,
        },
        {
          ...distance4Parent,
          distance: 4,
        },
        {
          ...distance5Parent,
          distance: 5,
        },
      ],
    });
  });

  it('returns relations from only 3 jumps if there are no more parents', async () => {
    const distance3Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-3-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    const distance2Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-2-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance3Parent['asset.ean']],
    };

    const distance1Parent: AssetWithoutTimestamp = {
      'asset.ean': 'parent-1-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance2Parent['asset.ean']],
    };

    const primaryAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance1Parent['asset.ean']],
    };

    // Only using directly referenced parents
    (getIndirectlyRelatedAssets as jest.Mock).mockResolvedValue([]);

    // Primary
    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAsset]);
    // Distance 1
    (getAssets as jest.Mock).mockResolvedValueOnce([distance1Parent]);
    // Distance 2
    (getAssets as jest.Mock).mockResolvedValueOnce([distance2Parent]);
    // Distance 3
    (getAssets as jest.Mock).mockResolvedValueOnce([distance3Parent]);

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAsset['asset.ean'],
        from: new Date().toISOString(),
        relation: 'ancestors',
        maxDistance: 5,
        size: 10,
      })
    ).resolves.toStrictEqual({
      primary: primaryAsset,
      ancestors: [
        {
          ...distance1Parent,
          distance: 1,
        },
        {
          ...distance2Parent,
          distance: 2,
        },
        {
          ...distance3Parent,
          distance: 3,
        },
      ],
    });
  });

  it('returns relations by distance even if there are multiple parents in each jump', async () => {
    const distance2ParentA: AssetWithoutTimestamp = {
      'asset.ean': 'parent-2-ean-a',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    const distance2ParentB: AssetWithoutTimestamp = {
      'asset.ean': 'parent-2-ean-b',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    const distance2ParentC: AssetWithoutTimestamp = {
      'asset.ean': 'parent-2-ean-c',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    const distance2ParentD: AssetWithoutTimestamp = {
      'asset.ean': 'parent-2-ean-d',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
    };

    const distance1ParentA: AssetWithoutTimestamp = {
      'asset.ean': 'parent-1-ean-a',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance2ParentA['asset.ean'], distance2ParentB['asset.ean']],
    };

    const distance1ParentB: AssetWithoutTimestamp = {
      'asset.ean': 'parent-1-ean-b',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance2ParentC['asset.ean'], distance2ParentD['asset.ean']],
    };

    const primaryAsset: AssetWithoutTimestamp = {
      'asset.ean': 'primary-ean',
      'asset.type': 'k8s.pod',
      'asset.kind': 'pod',
      'asset.id': uuid(),
      'asset.parents': [distance1ParentA['asset.ean'], distance1ParentB['asset.ean']],
    };

    // Only using directly referenced parents
    (getIndirectlyRelatedAssets as jest.Mock).mockResolvedValue([]);

    // Primary
    (getAssets as jest.Mock).mockResolvedValueOnce([primaryAsset]);
    // Distance 1
    (getAssets as jest.Mock).mockResolvedValueOnce([distance1ParentA, distance1ParentB]);
    // Distance 2 (the order matters)
    (getAssets as jest.Mock).mockResolvedValueOnce([distance2ParentA, distance2ParentB]);
    (getAssets as jest.Mock).mockResolvedValueOnce([distance2ParentC, distance2ParentD]);

    await expect(
      getAllRelatedAssets(esClientMock, {
        ean: primaryAsset['asset.ean'],
        from: new Date().toISOString(),
        relation: 'ancestors',
        maxDistance: 5,
        size: 10,
      })
    ).resolves.toStrictEqual({
      primary: primaryAsset,
      ancestors: [
        {
          ...distance1ParentA,
          distance: 1,
        },
        {
          ...distance1ParentB,
          distance: 1,
        },
        {
          ...distance2ParentA,
          distance: 2,
        },
        {
          ...distance2ParentB,
          distance: 2,
        },
        {
          ...distance2ParentC,
          distance: 2,
        },
        {
          ...distance2ParentD,
          distance: 2,
        },
      ],
    });
  });
});

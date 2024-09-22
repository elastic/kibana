/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';
import { ASSET_TYPES, AssetType } from './assets';

export const LINK_TYPES = {
  asset: 'asset',
} as const;

export type LinkType = ValuesType<typeof LINK_TYPES>;

interface LinkBase {
  type: LinkType;
}

export interface AssetLink extends LinkBase {
  type: 'asset';
  asset: {
    id: string;
    type: AssetType;
  };
}

export type Link = AssetLink;

export function serializeLink(link: Link) {
  const head = `${link.type}/`;
  if (link.type === 'asset') {
    return head + `${link.asset.type}/${link.asset.id}`;
  }
  throw new Error(`Unsupported link type: ${link.type}`);
}

const ALLOWED_ASSET_TYPES: string[] = Object.values(ASSET_TYPES);

export function deserializeLink(linkSerialized: string): Link {
  const [type, ...parts] = linkSerialized.split('/');

  if (type === 'asset') {
    const assetType = parts[0];
    if (!ALLOWED_ASSET_TYPES.includes(assetType)) {
      throw new Error(`Unsupported asset type ${assetType}`);
    }
    return {
      type,
      asset: {
        id: parts[1],
        type: assetType as AssetType,
      },
    };
  }
  throw new Error(`Unsupported link type: ${type}`);
}

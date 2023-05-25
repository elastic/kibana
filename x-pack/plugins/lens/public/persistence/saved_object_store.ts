/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, Query } from '@kbn/es-query';
import { SavedObjectReference } from '@kbn/core/public';
import { DataViewSpec } from '@kbn/data-views-plugin/public';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { SearchQuery } from '@kbn/content-management-plugin/common';
import { DOC_TYPE } from '../../common/constants';
import {
  LensCreateIn,
  LensCreateOut,
  LensGetIn,
  LensGetOut,
  LensSearchIn,
  LensSearchOut,
  LensSearchQuery,
  LensUpdateIn,
  LensUpdateOut,
} from '../../common/content_management';

export interface Document {
  savedObjectId?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  description?: string;
  state: {
    datasourceStates: Record<string, unknown>;
    visualization: unknown;
    query: Query;
    globalPalette?: {
      activePaletteId: string;
      state?: unknown;
    };
    filters: Filter[];
    adHocDataViews?: Record<string, DataViewSpec>;
    internalReferences?: SavedObjectReference[];
  };
  references: SavedObjectReference[];
}

export interface DocumentSaver {
  save: (vis: Document) => Promise<{ savedObjectId: string }>;
}

export interface DocumentLoader {
  load: (savedObjectId: string) => Promise<unknown>;
}

export type SavedObjectStore = DocumentLoader & DocumentSaver;

export class SavedObjectIndexStore implements SavedObjectStore {
  private client: ContentClient;

  constructor(client: ContentClient) {
    this.client = client;
  }

  save = async (vis: Document) => {
    const { savedObjectId, type, references, ...rest } = vis;
    const attributes = rest;

    if (savedObjectId) {
      const result = await this.client.update<LensUpdateIn, LensUpdateOut>({
        contentTypeId: 'lens',
        id: savedObjectId,
        data: attributes,
        options: {
          references,
        },
      });
      return { ...vis, savedObjectId: result.item.id };
    } else {
      const result = await this.client.create<LensCreateIn, LensCreateOut>({
        contentTypeId: 'lens',
        data: attributes,
        options: {
          references,
        },
      });
      return { ...vis, savedObjectId: result.item.id };
    }
  };

  async load(savedObjectId: string) {
    const resolveResult = await this.client.get<LensGetIn, LensGetOut>({
      contentTypeId: DOC_TYPE,
      id: savedObjectId,
    });

    if (resolveResult.item.error) {
      throw resolveResult.item.error;
    }

    return resolveResult;
  }

  async search(query: SearchQuery, options: LensSearchQuery) {
    const result = await this.client.search<LensSearchIn, LensSearchOut>({
      contentTypeId: DOC_TYPE,
      query,
      options,
    });
    return result;
  }
}

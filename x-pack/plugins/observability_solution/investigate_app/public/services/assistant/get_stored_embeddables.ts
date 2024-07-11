/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DashboardAttributes, SavedDashboardPanel } from '@kbn/dashboard-plugin/common';
import type { EmbeddableInput, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { compact, get, keyBy, partition, uniqBy } from 'lodash';
import { v4 } from 'uuid';

export interface StoredEmbeddable {
  savedObjectId?: string;
  id: string;
  title: string;
  description: string;
  type: string;
  config: Record<string, any>;
  dashboard?: {
    title: string;
    description: string;
  };
}

type MSearchParams = Parameters<ContentManagementPublicStart['client']['mSearch']>[0];

async function getAll({
  contentTypes,
  contentManagement,
  cursor,
  query,
}: {
  contentTypes: string[];
  contentManagement: ContentManagementPublicStart;
  query: MSearchParams['query'];
  cursor?: string;
}): Promise<SavedObjectCommon[]> {
  const response = await contentManagement.client.mSearch<SavedObjectCommon>({
    contentTypes: contentTypes.map((id) => ({ contentTypeId: id })),
    query: {
      cursor,
      limit: 1000,
    },
  });

  if (response.pagination.cursor) {
    return response.hits.concat(
      await getAll({
        contentManagement,
        contentTypes,
        cursor,
        query,
      })
    );
  }

  return response.hits as SavedObjectCommon[];
}

export async function getStoredEmbeddables({
  embeddable,
  contentManagement,
}: {
  embeddable: EmbeddableStart;
  contentManagement: ContentManagementPublicStart;
}): Promise<StoredEmbeddable[]> {
  const contentTypes: string[] = ['dashboard'];
  for (const factory of embeddable.getEmbeddableFactories()) {
    if (!factory.isContainerType && factory.savedObjectMetaData?.type) {
      contentTypes.push(factory.savedObjectMetaData.type);
    }
  }

  // is this correct? not sure

  for (const [_, reactSavedObject] of embeddable.getReactEmbeddableSavedObjects()) {
    contentTypes.push(reactSavedObject.savedObjectMetaData.type);
  }

  const savedObjects = await getAll({
    contentTypes,
    contentManagement,
    query: {},
  });

  const hits = savedObjects as Array<
    SavedObjectCommon<DashboardAttributes> | SavedObjectCommon<EmbeddableInput>
  >;

  const [dashboards, embeddableSavedObjects] = partition(
    hits,
    (hit): hit is SavedObjectCommon<DashboardAttributes> => hit.type === 'dashboard'
  );

  const storedEmbeddables = embeddableSavedObjects.map((savedObject): StoredEmbeddable => {
    return {
      title: savedObject.attributes.title ?? '',
      description: savedObject.attributes.description ?? '',
      type: savedObject.type,
      savedObjectId: savedObject.id,
      id: savedObject.id,
      config: {
        attributes: savedObject.attributes,
      },
    };
  });

  const storedEmbeddablesById = keyBy(storedEmbeddables, (so) => so.savedObjectId!);

  const panelsFromDashboards = dashboards.flatMap((dashboardSO) => {
    const panels = JSON.parse(dashboardSO.attributes.panelsJSON) as SavedDashboardPanel[];

    const referencesByName = keyBy(dashboardSO.references, (reference) => reference.name);

    return compact(
      panels.map((panel): StoredEmbeddable | undefined => {
        let savedObjectId: string | undefined;
        if (panel.panelRefName) {
          const reference =
            referencesByName[panel.panelIndex + ':' + panel.panelRefName] || undefined;
          savedObjectId = reference?.id;
        }

        if (!savedObjectId) {
          savedObjectId = panel.panelIndex;
        }

        const storedEmbeddable = storedEmbeddablesById[savedObjectId];

        if (storedEmbeddable) {
          return storedEmbeddable;
        }

        return {
          type: panel.type,
          title: String(panel.title ?? get(panel.embeddableConfig, 'attributes.title') ?? ''),
          description: String(get(panel.embeddableConfig, 'attributes.description') ?? ''),
          config: panel.embeddableConfig as Record<string, any>,
          id: v4(),
          dashboard: {
            title: dashboardSO.attributes.title,
            description: dashboardSO.attributes.description,
          },
        };
      })
    );
  });

  return uniqBy(
    [...storedEmbeddables, ...panelsFromDashboards].filter(
      (storedEmbeddable) => !!storedEmbeddable.title
    ),
    (storedEmbeddable) => storedEmbeddable.id
  );
}

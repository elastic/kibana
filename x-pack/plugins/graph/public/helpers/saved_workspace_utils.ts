/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, assign, defaults, forOwn } from 'lodash';
import { i18n } from '@kbn/i18n';
import { CoreStart, IBasePath, SavedObjectAttributes } from '@kbn/core/public';

import { SavedObjectSaveOpts, isErrorNonFatal } from '@kbn/saved-objects-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { ContentClient } from '@kbn/content-management-plugin/public';
import {
  GraphGetIn,
  GraphGetOut,
  GraphSearchIn,
  GraphSearchOut,
  GraphDeleteIn,
  GraphDeleteOut,
  GraphCreateIn,
  GraphCreateOut,
  GraphSavedObjectAttributes,
  GraphUpdateOut,
  GraphUpdateIn,
  CONTENT_ID,
} from '../../common/content_management';
import {
  injectReferences,
  extractReferences,
} from '../services/persistence/saved_workspace_references';
import { GraphWorkspaceSavedObject } from '../types';
import { checkForDuplicateTitle, saveWithConfirmation } from './saved_objects_utils';
const savedWorkspaceType = 'graph-workspace';
const mapping: Record<string, string> = {
  title: 'text',
  description: 'text',
  numLinks: 'integer',
  numVertices: 'integer',
  version: 'integer',
  wsState: 'json',
};
const defaultsProps = {
  title: i18n.translate('xpack.graph.savedWorkspace.workspaceNameTitle', {
    defaultMessage: 'New Graph Workspace',
  }),
  numLinks: 0,
  numVertices: 0,
  wsState: '{}',
  version: 1,
};

const urlFor = (basePath: IBasePath, id: string) =>
  basePath.prepend(`/app/graph#/workspace/${encodeURIComponent(id)}`);

function mapHits(hit: any, url: string): GraphWorkspaceSavedObject {
  const source = hit.attributes;
  source.id = hit.id;
  source.url = url;
  source.updatedAt = hit.updatedAt;
  source.icon = 'cluster'; // maybe there's a better choice here?
  return source;
}

interface SavedWorkspaceServices {
  basePath: IBasePath;
  contentClient: ContentClient;
}

export function findSavedWorkspace(
  { contentClient, basePath }: SavedWorkspaceServices,
  searchString: string,
  size: number = 100
) {
  return contentClient
    .search<GraphSearchIn, GraphSearchOut>({
      contentTypeId: CONTENT_ID,
      query: {
        text: searchString ? `${searchString}*` : '',
      },
    })
    .then((resp) => {
      return {
        total: resp.pagination.total,
        hits: resp.hits.map((hit) => mapHits(hit, urlFor(basePath, hit.id))),
      };
    });
}

export function getEmptyWorkspace() {
  return {
    savedObject: {
      displayName: 'graph workspace',
      getEsType: () => savedWorkspaceType,
      ...defaultsProps,
    } as GraphWorkspaceSavedObject,
  };
}

export async function getSavedWorkspace(contentClient: ContentClient, id: string) {
  const resolveResult = await contentClient.get<GraphGetIn, GraphGetOut>({
    contentTypeId: CONTENT_ID,
    id,
  });

  const resp = resolveResult.item;

  if (!resp.attributes) {
    throw new SavedObjectNotFound(savedWorkspaceType, id || '');
  }

  const savedObject = {
    id,
    displayName: 'graph workspace',
    getEsType: () => savedWorkspaceType,
    _source: cloneDeep({
      ...resp.attributes,
    }),
  } as unknown as GraphWorkspaceSavedObject;

  // assign the defaults to the response
  defaults(savedObject._source, defaultsProps);

  // transform the source using JSON.parse
  if (savedObject._source.wsState) {
    savedObject._source.wsState = JSON.parse(savedObject._source.wsState as string);
  }

  // Give obj all of the values in _source.fields
  assign(savedObject, savedObject._source);
  savedObject.lastSavedTitle = savedObject.title;

  if (resp.references && resp.references.length > 0) {
    injectReferences(savedObject, resp.references);
  }

  const sharingSavedObjectProps = {
    outcome: resolveResult.meta.outcome,
    aliasTargetId: resolveResult.meta.aliasTargetId,
    aliasPurpose: resolveResult.meta.aliasPurpose,
  };

  return {
    savedObject,
    sharingSavedObjectProps,
  };
}

export function deleteSavedWorkspace(contentClient: ContentClient, ids: string[]) {
  return Promise.all(
    ids.map((id: string) =>
      contentClient.delete<GraphDeleteIn, GraphDeleteOut>({
        contentTypeId: CONTENT_ID,
        id,
      })
    )
  );
}

export async function saveSavedWorkspace(
  savedObject: GraphWorkspaceSavedObject,
  {
    confirmOverwrite = false,
    isTitleDuplicateConfirmed = false,
    onTitleDuplicate,
  }: SavedObjectSaveOpts = {},
  services: {
    contentClient: ContentClient;
  } & Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme'>
) {
  let attributes: SavedObjectAttributes = {};

  forOwn(mapping, (fieldType, fieldName) => {
    const savedObjectFieldVal = savedObject[fieldName as keyof GraphWorkspaceSavedObject] as string;
    if (savedObjectFieldVal != null) {
      attributes[fieldName as keyof GraphWorkspaceSavedObject] =
        fieldName === 'wsState' ? JSON.stringify(savedObjectFieldVal) : savedObjectFieldVal;
    }
  });
  const extractedRefs = extractReferences({ attributes, references: [] });
  const references = extractedRefs.references;
  attributes = extractedRefs.attributes;

  if (!references) {
    throw new Error('References not returned from extractReferences');
  }

  // Save the original id in case the save fails.
  const originalId = savedObject.id;

  try {
    // Read https://github.com/elastic/kibana/issues/9056 and
    // https://github.com/elastic/kibana/issues/9012 for some background into why this copyOnSave variable
    // exists.
    // The goal is to move towards a better rename flow, but since our users have been conditioned
    // to expect a 'save as' flow during a rename, we are keeping the logic the same until a better
    // UI/UX can be worked out.
    if (savedObject.copyOnSave) {
      delete savedObject.id;
    }

    savedObject.isSaving = true;

    await checkForDuplicateTitle(
      savedObject as any,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
      services
    );

    const createOpt = {
      id: savedObject.id,
      migrationVersion: savedObject.migrationVersion,
      references,
    };
    const resp = confirmOverwrite
      ? await saveWithConfirmation(
          attributes as GraphSavedObjectAttributes,
          savedObject,
          createOpt,
          services
        )
      : savedObject.id
      ? await services.contentClient.update<GraphUpdateIn, GraphUpdateOut>({
          contentTypeId: CONTENT_ID,
          id: savedObject.id,
          data: {
            ...(extractedRefs.attributes as GraphSavedObjectAttributes),
          },
          options: {
            references: extractedRefs.references,
          },
        })
      : await services.contentClient.create<GraphCreateIn, GraphCreateOut>({
          contentTypeId: CONTENT_ID,
          data: attributes as GraphSavedObjectAttributes,
          options: {
            references: createOpt.references,
            overwrite: true,
          },
        });

    savedObject.id = resp.item.id;
    savedObject.isSaving = false;
    savedObject.lastSavedTitle = savedObject.title;
    return savedObject.id;
  } catch (err) {
    savedObject.isSaving = false;
    savedObject.id = originalId;
    if (isErrorNonFatal(err)) {
      return '';
    }
    return Promise.reject(err);
  }
}

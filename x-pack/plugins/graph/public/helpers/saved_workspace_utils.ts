/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, assign, defaults, forOwn } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  IBasePath,
  OverlayStart,
  SavedObjectsClientContract,
  SavedObjectAttributes,
} from 'kibana/public';

import {
  SavedObjectSaveOpts,
  checkForDuplicateTitle,
  saveWithConfirmation,
  isErrorNonFatal,
  SavedObjectKibanaServices,
} from '../../../../../src/plugins/saved_objects/public';
import {
  injectReferences,
  extractReferences,
} from '../services/persistence/saved_workspace_references';
import { SavedObjectNotFound } from '../../../../../src/plugins/kibana_utils/public';
import { GraphWorkspaceSavedObject } from '../types';

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

function mapHits(hit: { id: string; attributes: Record<string, unknown> }, url: string) {
  const source = hit.attributes;
  source.id = hit.id;
  source.url = url;
  source.icon = 'fa-share-alt'; // looks like a graph
  return source;
}

interface SavedWorkspaceServices {
  basePath: IBasePath;
  savedObjectsClient: SavedObjectsClientContract;
}

export function findSavedWorkspace(
  { savedObjectsClient, basePath }: SavedWorkspaceServices,
  searchString: string,
  size: number = 100
) {
  return savedObjectsClient
    .find<Record<string, unknown>>({
      type: savedWorkspaceType,
      search: searchString ? `${searchString}*` : undefined,
      perPage: size,
      searchFields: ['title^3', 'description'],
    })
    .then((resp) => {
      return {
        total: resp.total,
        hits: resp.savedObjects.map((hit) => mapHits(hit, urlFor(basePath, hit.id))),
      };
    });
}

export async function getSavedWorkspace(
  savedObjectsClient: SavedObjectsClientContract,
  id?: string
) {
  const savedObject = {
    id,
    displayName: 'graph workspace',
    getEsType: () => savedWorkspaceType,
  } as { [key: string]: any };

  if (!id) {
    assign(savedObject, defaultsProps);
    return Promise.resolve(savedObject);
  }

  const resp = await savedObjectsClient.get<Record<string, unknown>>(savedWorkspaceType, id);
  savedObject._source = cloneDeep(resp.attributes);

  if (!resp._version) {
    throw new SavedObjectNotFound(savedWorkspaceType, id || '');
  }

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

  return savedObject as GraphWorkspaceSavedObject;
}

export function deleteSavedWorkspace(
  savedObjectsClient: SavedObjectsClientContract,
  ids: string[]
) {
  return Promise.all(ids.map((id: string) => savedObjectsClient.delete(savedWorkspaceType, id)));
}

export async function saveSavedWorkspace(
  savedObject: GraphWorkspaceSavedObject,
  {
    confirmOverwrite = false,
    isTitleDuplicateConfirmed = false,
    onTitleDuplicate,
  }: SavedObjectSaveOpts = {},
  services: {
    savedObjectsClient: SavedObjectsClientContract;
    overlays: OverlayStart;
  }
) {
  // Save the original id in case the save fails.
  const originalId = savedObject.id;
  // Read https://github.com/elastic/kibana/issues/9056 and
  // https://github.com/elastic/kibana/issues/9012 for some background into why this copyOnSave variable
  // exists.
  // The goal is to move towards a better rename flow, but since our users have been conditioned
  // to expect a 'save as' flow during a rename, we are keeping the logic the same until a better
  // UI/UX can be worked out.
  if (savedObject.copyOnSave) {
    delete savedObject.id;
  }

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

  try {
    await checkForDuplicateTitle(
      savedObject as any,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
      services as SavedObjectKibanaServices
    );
    savedObject.isSaving = true;

    const createOpt = {
      id: savedObject.id,
      migrationVersion: savedObject.migrationVersion,
      references,
    };
    const resp = confirmOverwrite
      ? await saveWithConfirmation(attributes, savedObject, createOpt, services)
      : await services.savedObjectsClient.create(savedObject.getEsType(), attributes, {
          ...createOpt,
          overwrite: true,
        });

    savedObject.id = resp.id;
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

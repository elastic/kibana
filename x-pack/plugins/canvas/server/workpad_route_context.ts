/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomRequestHandlerContext,
  RequestHandlerContextProvider,
  SavedObject,
  SavedObjectsResolveResponse,
} from 'kibana/server';
import { ExpressionsServiceStart } from 'src/plugins/expressions';
import { WorkpadAttributes } from './routes/workpad/workpad_attributes';
import { CANVAS_TYPE } from '../common/lib/constants';
import { injectReferences, extractReferences } from './saved_objects/workpad_references';
import { getId } from '../common/lib/get_id';
import { CanvasWorkpad, ImportedCanvasWorkpad } from '../types';

export type CanvasRouteHandlerContext = CustomRequestHandlerContext<{
  canvas: {
    workpad: {
      create: (attributes: CanvasWorkpad) => Promise<SavedObject<WorkpadAttributes>>;
      import: (workpad: ImportedCanvasWorkpad) => Promise<SavedObject<WorkpadAttributes>>;
      get: (id: string) => Promise<SavedObject<WorkpadAttributes>>;
      resolve: (id: string) => Promise<SavedObjectsResolveResponse<WorkpadAttributes>>;
      update: (
        id: string,
        attributes: Partial<CanvasWorkpad>
      ) => Promise<SavedObject<WorkpadAttributes>>;
    };
  };
}>;

interface Deps {
  expressions: ExpressionsServiceStart;
}

export const createWorkpadRouteContext: (
  deps: Deps
) => RequestHandlerContextProvider<CanvasRouteHandlerContext, 'canvas'> = ({ expressions }) => {
  return async (context) => {
    const soClient = (await context.core).savedObjects.client;
    return {
      workpad: {
        create: async (workpad: CanvasWorkpad) => {
          const now = new Date().toISOString();
          const { id: maybeId, ...attributes } = workpad;

          const id = maybeId ? maybeId : getId('workpad');

          const { workpad: extractedAttributes, references } = extractReferences(
            attributes,
            expressions
          );

          return await soClient.create<WorkpadAttributes>(
            CANVAS_TYPE,
            {
              ...extractedAttributes,
              '@timestamp': now,
              '@created': now,
            },
            { id, references }
          );
        },
        import: async (workpad: ImportedCanvasWorkpad) => {
          const now = new Date().toISOString();
          const { id: maybeId, ...workpadWithoutId } = workpad;

          // Functionality of running migrations on import of workpads was implemented in v8.1.0.
          // As only attributes of the saved object workpad are exported, to run migrations it is necessary
          // to specify the minimal version of possible migrations to execute them. It is v8.0.0 in the current case.
          const DEFAULT_MIGRATION_VERSION = { [CANVAS_TYPE]: '8.0.0' };
          const DEFAULT_CORE_MIGRATION_VERSION = '8.0.0';

          const id = maybeId ? maybeId : getId('workpad');

          return await soClient.create<WorkpadAttributes>(
            CANVAS_TYPE,
            {
              isWriteable: true,
              ...workpadWithoutId,
              '@timestamp': now,
              '@created': now,
            },
            {
              migrationVersion: DEFAULT_MIGRATION_VERSION,
              coreMigrationVersion: DEFAULT_CORE_MIGRATION_VERSION,
              id,
            }
          );
        },
        get: async (id: string) => {
          const workpad = await soClient.get<WorkpadAttributes>(CANVAS_TYPE, id);

          workpad.attributes = injectReferences(
            workpad.attributes,
            workpad.references,
            expressions
          );

          return workpad;
        },
        resolve: async (id: string) => {
          const resolved = await soClient.resolve<WorkpadAttributes>(CANVAS_TYPE, id);

          resolved.saved_object.attributes = injectReferences(
            resolved.saved_object.attributes,
            resolved.saved_object.references,
            expressions
          );

          return resolved;
        },
        update: async (id: string, { id: omittedId, ...workpad }: Partial<CanvasWorkpad>) => {
          const now = new Date().toISOString();

          const workpadObject = await soClient.get<WorkpadAttributes>(CANVAS_TYPE, id);

          const injectedAttributes = injectReferences(
            workpadObject.attributes,
            workpadObject.references,
            expressions
          );

          const updatedAttributes = {
            ...injectedAttributes,
            ...workpad,
            '@timestamp': now, // always update the modified time
            '@created': workpadObject.attributes['@created'], // ensure created is not modified
          } as WorkpadAttributes;

          const extracted = extractReferences(updatedAttributes, expressions);

          return await soClient.create(CANVAS_TYPE, extracted.workpad, {
            overwrite: true,
            id,
            references: extracted.references,
          });
        },
      },
    };
  };
};

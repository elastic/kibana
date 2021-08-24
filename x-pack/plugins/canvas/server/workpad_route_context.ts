/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext, RequestHandlerContextProvider, SavedObject } from 'kibana/server';
import { ExpressionsService } from 'src/plugins/expressions';
import { WorkpadAttributes } from './routes/workpad/workpad_attributes';
import { CANVAS_TYPE } from '../common/lib/constants';
import { injectReferences, extractReferences } from './saved_objects/workpad_references';
import { getId } from '../common/lib/get_id';
import { CanvasWorkpad } from '../types';

export interface CanvasRouteHandlerContext extends RequestHandlerContext {
  canvas: {
    workpad: {
      create: (attributes: CanvasWorkpad) => Promise<SavedObject<WorkpadAttributes>>;
      get: (id: string) => Promise<SavedObject<WorkpadAttributes>>;
      update: (
        id: string,
        attributes: Partial<CanvasWorkpad>
      ) => Promise<SavedObject<WorkpadAttributes>>;
    };
  };
}

interface Deps {
  expressions: ExpressionsService;
}

export const createWorkpadRouteContext: (
  deps: Deps
) => RequestHandlerContextProvider<CanvasRouteHandlerContext, 'canvas'> = ({ expressions }) => {
  return (context) => ({
    workpad: {
      create: async (workpad: CanvasWorkpad) => {
        const now = new Date().toISOString();
        const { id: maybeId, ...attributes } = workpad;

        const id = maybeId ? maybeId : getId('workpad');

        const { workpad: extractedAttributes, references } = extractReferences(
          attributes,
          expressions
        );

        return await context.core.savedObjects.client.create<WorkpadAttributes>(
          CANVAS_TYPE,
          {
            ...extractedAttributes,
            '@timestamp': now,
            '@created': now,
          },
          { id, references }
        );
      },
      get: async (id: string) => {
        const workpad = await context.core.savedObjects.client.get<WorkpadAttributes>(
          CANVAS_TYPE,
          id
        );

        workpad.attributes = injectReferences(workpad.attributes, workpad.references, expressions);

        return workpad;
      },
      update: async (id: string, { id: omittedId, ...workpad }: Partial<CanvasWorkpad>) => {
        const now = new Date().toISOString();

        const workpadObject = await context.core.savedObjects.client.get<WorkpadAttributes>(
          CANVAS_TYPE,
          id
        );

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

        return await context.core.savedObjects.client.create(CANVAS_TYPE, extracted.workpad, {
          overwrite: true,
          id,
          references: extracted.references,
        });
      },
    },
  });
};

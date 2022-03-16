/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsResolveResponse } from 'src/core/public';
import { CanvasWorkpad, CanvasTemplate } from '../../types';
import { CanvasRenderedWorkpad } from '../../shareable_runtime/types';

export type FoundWorkpads = Array<Pick<CanvasWorkpad, 'name' | 'id' | '@timestamp' | '@created'>>;
export type FoundWorkpad = FoundWorkpads[number];
export interface WorkpadFindResponse {
  total: number;
  workpads: FoundWorkpads;
}

export interface TemplateFindResponse {
  templates: CanvasTemplate[];
}

export interface ResolveWorkpadResponse {
  workpad: CanvasWorkpad;
  outcome: SavedObjectsResolveResponse['outcome'];
  aliasId?: SavedObjectsResolveResponse['alias_target_id'];
  aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
}

export interface CanvasWorkpadService {
  get: (id: string) => Promise<CanvasWorkpad>;
  resolve: (id: string) => Promise<ResolveWorkpadResponse>;
  create: (workpad: CanvasWorkpad) => Promise<CanvasWorkpad>;
  import: (workpad: CanvasWorkpad) => Promise<CanvasWorkpad>;
  createFromTemplate: (templateId: string) => Promise<CanvasWorkpad>;
  find: (term: string) => Promise<WorkpadFindResponse>;
  remove: (id: string) => Promise<void>;
  findTemplates: () => Promise<TemplateFindResponse>;
  update: (id: string, workpad: CanvasWorkpad) => Promise<void>;
  updateWorkpad: (id: string, workpad: CanvasWorkpad) => Promise<void>;
  updateAssets: (id: string, assets: CanvasWorkpad['assets']) => Promise<void>;
  getRuntimeZip: (workpad: CanvasRenderedWorkpad) => Promise<Blob>;
}

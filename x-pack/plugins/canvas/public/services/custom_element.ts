/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomElement } from '../../types';

export interface CustomElementFindResponse {
  total: number;
  customElements: CustomElement[];
}

export interface CanvasCustomElementService {
  create: (customElement: CustomElement) => Promise<void>;
  get: (customElementId: string) => Promise<CustomElement>;
  update: (id: string, element: Partial<CustomElement>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  find: (searchTerm: string) => Promise<CustomElementFindResponse>;
}

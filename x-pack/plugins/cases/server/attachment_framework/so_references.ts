/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes, SavedObjectReference } from '@kbn/core/types';
import { PersistableStateAttachmentTypeRegistry } from './persistable_state_registry';

interface SavedObjectAttributesAndReferences {
  attributes: SavedObjectAttributes;
  references: SavedObjectReference[];
}

interface ExtractDeps {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}

type InjectDeps = ExtractDeps;

export function extractReferences(
  { attributes, references = [] }: SavedObjectAttributesAndReferences,
  deps: ExtractDeps
): SavedObjectAttributesAndReferences {}

export function injectReferences(
  { attributes, references = [] }: SavedObjectAttributesAndReferences,
  deps: InjectDeps
): SavedObjectAttributes {}

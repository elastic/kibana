/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { SavedObject, SavedObjectReference } from '@kbn/core/server';

export type SavedObjectAttributesWithReferences<SavedObjectAttributes> = Pick<
  SavedObject<SavedObjectAttributes>,
  'attributes' | 'references'
>;

export type SavedObjectReferenceExtractor<SavedObjectAttributes> = (
  savedObjectAttributes: SavedObjectAttributes
) => SavedObjectAttributesWithReferences<SavedObjectAttributes>;

export type SavedObjectReferenceResolver<SavedObjectAttributes> = (
  savedObjectAttributes: SavedObjectAttributes,
  references: SavedObjectReference[]
) => SavedObjectAttributes;

export const savedObjectReferenceRT = rt.strict({
  name: rt.string,
  type: rt.string,
  id: rt.string,
});

/**
 * Rewrites a saved object such that well-known saved object references
 * are extracted in the `references` array and replaced by the appropriate
 * name. This is the inverse operation to `resolveSavedObjectReferences`.
 */
export const extractSavedObjectReferences =
  <SavedObjectAttributes>(
    referenceExtractors: Array<SavedObjectReferenceExtractor<SavedObjectAttributes>>
  ) =>
  (
    savedObjectAttributes: SavedObjectAttributes
  ): SavedObjectAttributesWithReferences<SavedObjectAttributes> =>
    referenceExtractors.reduce<SavedObjectAttributesWithReferences<SavedObjectAttributes>>(
      ({ attributes: accumulatedAttributes, references: accumulatedReferences }, extract) => {
        const { attributes, references } = extract(accumulatedAttributes);
        return {
          attributes,
          references: [...accumulatedReferences, ...references],
        };
      },
      {
        attributes: savedObjectAttributes,
        references: [],
      }
    );

/**
 * Rewrites a source configuration such that well-known saved object references
 * are resolved from the `references` argument and replaced by the real saved
 * object ids. This is the inverse operation to `extractSavedObjectReferences`.
 */
export const resolveSavedObjectReferences =
  <SavedObjectAttributes>(
    referenceResolvers: Array<SavedObjectReferenceResolver<SavedObjectAttributes>>
  ) =>
  (attributes: SavedObjectAttributes, references: SavedObjectReference[]): SavedObjectAttributes =>
    referenceResolvers.reduce<SavedObjectAttributes>(
      (accumulatedAttributes, resolve) => resolve(accumulatedAttributes, references),
      attributes
    );

export class SavedObjectReferenceResolutionError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'SavedObjectReferenceResolutionError';
  }
}

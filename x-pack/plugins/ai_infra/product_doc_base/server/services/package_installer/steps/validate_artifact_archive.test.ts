/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZipArchive } from '../utils/zip_archive';
import { validateArtifactArchive } from './validate_artifact_archive';

const createMockArchive = (entryPaths: string[]): ZipArchive => {
  return {
    hasEntry: (entryPath) => entryPaths.includes(entryPath),
    getEntryPaths: () => entryPaths,
    getEntryContent: () => {
      throw new Error('non implemented');
    },
    close: () => undefined,
  };
};

describe('validateArtifactArchive', () => {
  it('validates that the archive contains all the mandatory files', () => {
    const archive = createMockArchive([
      'manifest.json',
      'mappings.json',
      'content/content-1.ndjson',
    ]);

    const validation = validateArtifactArchive(archive);

    expect(validation).toEqual({ valid: true });
  });

  it('does not validate if the archive does not contain a manifest', () => {
    const archive = createMockArchive(['something.txt']);

    const validation = validateArtifactArchive(archive);

    expect(validation).toMatchInlineSnapshot(`
      Object {
        "error": "Manifest file not found",
        "valid": false,
      }
    `);
  });

  it('does not validate  if the archive does not contain mappings', () => {
    const archive = createMockArchive(['manifest.json']);

    const validation = validateArtifactArchive(archive);

    expect(validation).toMatchInlineSnapshot(`
      Object {
        "error": "Mapping file not found",
        "valid": false,
      }
    `);
  });

  it('does not validate  if the archive does not contain content files', () => {
    const archive = createMockArchive(['manifest.json', 'mappings.json']);

    const validation = validateArtifactArchive(archive);

    expect(validation).toMatchInlineSnapshot(`
      Object {
        "error": "No content files were found",
        "valid": false,
      }
    `);
  });
});

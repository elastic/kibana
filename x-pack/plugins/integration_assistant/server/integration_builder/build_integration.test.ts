/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Integration } from '../../common';
import { renderPackageManifestYAML } from './build_integration';
import yaml from 'js-yaml';

describe('renderPackageManifestYAML', () => {
  test('generates the package manifest correctly', () => {
    const integration: Integration = {
      title: 'Sample Integration',
      name: 'sample-integration',
      description:
        '  This is a sample integration\n\nWith multiple lines   and    weird  spacing. \n\n  And more lines  ',
      logo: 'some-logo.png',
      dataStreams: [
        {
          name: 'data-stream-1',
          title: 'Data Stream 1',
          description: 'This is data stream 1',
          inputTypes: ['filestream'],
          rawSamples: ['{field: "value"}'],
          pipeline: {
            processors: [],
          },
          docs: [],
          samplesFormat: { name: 'ndjson', multiline: false },
        },
        {
          name: 'data-stream-2',
          title: 'Data Stream 2',
          description:
            'This is data stream 2\nWith multiple lines of description\nBut otherwise, nothing special',
          inputTypes: ['aws-cloudwatch'],
          pipeline: {
            processors: [],
          },
          rawSamples: ['field="value"'],
          docs: [],
          samplesFormat: { name: 'structured' },
        },
      ],
    };

    const manifestContent = renderPackageManifestYAML(integration);

    // The manifest content must be parseable as YAML.
    const manifest = yaml.safeLoad(manifestContent);

    expect(manifest).toBeDefined();
    expect(manifest.title).toBe(integration.title);
    expect(manifest.name).toBe(integration.name);
    expect(manifest.type).toBe('integration');
    expect(manifest.description).toBe(integration.description);
    expect(manifest.icons).toBeTruthy();
  });
});

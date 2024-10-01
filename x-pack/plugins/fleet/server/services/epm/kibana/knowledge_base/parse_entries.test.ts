/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { times } from 'lodash';
import type { PackageInstallContext } from '../../../../../common/types';
import { parseKnowledgeBaseEntries } from './parse_entries';

describe('parseKnowledgeBaseEntries', () => {
  const createInstallContext = (assets: Record<string, string>): PackageInstallContext => {
    const installContext: PackageInstallContext = {
      packageInfo: {
        format_version: '3.4.0',
        name: 'test-pkg',
        title: 'Test Pkg',
        description: 'Some desc',
        version: '0.0.1',
        owner: { github: 'owner', type: 'elastic' },
      },
      assetsMap: new Map(),
      paths: [],
    };

    Object.entries(assets).forEach(([assetPath, assetContent]) => {
      installContext.paths.push(assetPath);
      installContext.assetsMap.set(assetPath, Buffer.from(assetContent));
    });

    return installContext;
  };

  const createManifest = ({
    title,
    description = 'description',
    systemIndex = true,
    syntacticFields = ['field_1', 'field_2'],
  }: {
    title: string;
    description?: string;
    systemIndex?: boolean;
    syntacticFields?: string[];
  }) => {
    return `
    title: ${title}
    description: ${description}
    index:
      system: ${systemIndex}
    retrieval:
      syntactic_fields: [${syntacticFields.join(',')}]
      semantic_fields: []
    `;
  };

  const createFieldsFile = () => {
    return `
    - name: content_title
      type: text
      description: The title of the document
    - name: content_body
      type: semantic_text
      inference_id: kibana-elser2
      description: The content of the document
    `;
  };

  const createContentFile = (length = 5) => {
    return times(5)
      .map(() => '{}')
      .join('\n');
  };

  it('parses a single entry package', async () => {
    const assets: Record<string, string> = {
      'test-pkg/kibana/knowledge_base_entry/foo/manifest.yml': createManifest({ title: 'foo' }),
      'test-pkg/kibana/knowledge_base_entry/foo/fields/fields.yml': createFieldsFile(),
      'test-pkg/kibana/knowledge_base_entry/foo/content/content-1.ndjson': createContentFile(),
      'test-pkg/kibana/knowledge_base_entry/foo/content/content-2.ndjson': createContentFile(),
    };
    const installContext = createInstallContext(assets);

    const parsed = parseKnowledgeBaseEntries(installContext);

    const entryInfo = parsed[0];

    expect(entryInfo.name).toEqual('foo');
    expect(entryInfo.manifest).toEqual({
      title: 'foo',
      description: 'description',
      index: {
        system: true,
      },
      retrieval: {
        semantic_fields: [],
        syntactic_fields: ['field_1', 'field_2'],
      },
    });
    expect(entryInfo.folderPath).toEqual('test-pkg/kibana/knowledge_base_entry/foo');
    expect(entryInfo.fields.map((field) => field.name)).toEqual(['content_title', 'content_body']);
    expect(entryInfo.contentFilePaths).toEqual([
      'test-pkg/kibana/knowledge_base_entry/foo/content/content-1.ndjson',
      'test-pkg/kibana/knowledge_base_entry/foo/content/content-2.ndjson',
    ]);
  });
});

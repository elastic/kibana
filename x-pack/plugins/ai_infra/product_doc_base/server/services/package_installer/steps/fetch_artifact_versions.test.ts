/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch, { Response } from 'node-fetch';
import { fetchArtifactVersions } from './fetch_artifact_versions';
import { getArtifactName, DocumentationProduct, ProductName } from '@kbn/product-doc-common';

jest.mock('node-fetch');
const fetchMock = fetch as jest.MockedFn<typeof fetch>;

const createResponse = ({
  artifactNames,
  truncated = false,
}: {
  artifactNames: string[];
  truncated?: boolean;
}) => {
  return `
  <ListBucketResult xmlns="http://doc.s3.amazonaws.com/2006-03-01">
    <Name>kibana-ai-assistant-kb-artifacts</Name>
    <Prefix/>
    <Marker/>
    <IsTruncated>${truncated}</IsTruncated>
    ${artifactNames.map(
      (artifactName) => `
       <Contents>
        <Key>${artifactName}</Key>
        <Generation>1728486063097626</Generation>
        <MetaGeneration>1</MetaGeneration>
        <LastModified>2024-10-09T15:01:03.137Z</LastModified>
        <ETag>"e0584955969eccf2a16b8829f768cb1f"</ETag>
        <Size>36781438</Size>
      </Contents>`
    )}
  </ListBucketResult>
  `;
};

const artifactRepositoryUrl = 'https://lost.com';

const expectVersions = (
  versions: Partial<Record<ProductName, string[]>>
): Record<ProductName, string[]> => {
  const response = {} as Record<ProductName, string[]>;
  Object.values(DocumentationProduct).forEach((productName) => {
    response[productName] = [];
  });
  return {
    ...response,
    ...versions,
  };
};

describe('fetchArtifactVersions', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  const mockResponse = (responseText: string) => {
    const response = {
      text: () => Promise.resolve(responseText),
    };
    fetchMock.mockResolvedValue(response as Response);
  };

  it('calls fetch with the right parameters', async () => {
    mockResponse(createResponse({ artifactNames: [] }));

    await fetchArtifactVersions({ artifactRepositoryUrl });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${artifactRepositoryUrl}?max-keys=1000`);
  });

  it('returns the list of versions from the repository', async () => {
    const artifactNames = [
      getArtifactName({ productName: 'kibana', productVersion: '8.16' }),
      getArtifactName({ productName: 'elasticsearch', productVersion: '8.16' }),
    ];
    mockResponse(createResponse({ artifactNames }));

    const versions = await fetchArtifactVersions({ artifactRepositoryUrl });

    expect(versions).toEqual(
      expectVersions({
        kibana: ['8.16'],
        elasticsearch: ['8.16'],
      })
    );
  });

  it('retrieve all versions for each product', async () => {
    const artifactNames = [
      getArtifactName({ productName: 'kibana', productVersion: '8.15' }),
      getArtifactName({ productName: 'kibana', productVersion: '8.16' }),
      getArtifactName({ productName: 'kibana', productVersion: '8.17' }),
      getArtifactName({ productName: 'elasticsearch', productVersion: '8.16' }),
      getArtifactName({ productName: 'elasticsearch', productVersion: '9.0' }),
    ];
    mockResponse(createResponse({ artifactNames }));

    const versions = await fetchArtifactVersions({ artifactRepositoryUrl });

    expect(versions).toEqual(
      expectVersions({
        kibana: ['8.15', '8.16', '8.17'],
        elasticsearch: ['8.16', '9.0'],
      })
    );
  });

  it('throws an error if the response is truncated', async () => {
    mockResponse(createResponse({ artifactNames: [], truncated: true }));

    await expect(fetchArtifactVersions({ artifactRepositoryUrl })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "Unhandled error. (Error: bucket content is truncated, cannot retrieve all versions
          at /Users/pgayvallet/DEV/workspaces/elastic/kibana/x-pack/plugins/ai_infra/product_doc_base/server/services/package_installer/steps/fetch_artifact_versions.ts:29:15
          at Parser.<anonymous> (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/xml2js/lib/parser.js:308:18)
          at Parser.emit (node:events:519:28)
          at SAXParser.onclosetag (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/xml2js/lib/parser.js:266:26)
          at emit (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/sax/lib/sax.js:625:35)
          at emitNode (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/sax/lib/sax.js:630:5)
          at closeTag (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/sax/lib/sax.js:890:7)
          at SAXParser.write (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/sax/lib/sax.js:1437:13)
          at Parser.Object.<anonymous>.exports.Parser.Parser.parseString (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/xml2js/lib/parser.js:327:31)
          at Parser.parseString (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/xml2js/lib/parser.js:5:59)
          at Object.<anonymous>.exports.parseString (/Users/pgayvallet/DEV/workspaces/elastic/kibana/node_modules/xml2js/lib/parser.js:373:19)
          at /Users/pgayvallet/DEV/workspaces/elastic/kibana/x-pack/plugins/ai_infra/product_doc_base/server/services/package_installer/steps/fetch_artifact_versions.ts:22:16
          at new Promise (<anonymous>)
          at fetchArtifactVersions (/Users/pgayvallet/DEV/workspaces/elastic/kibana/x-pack/plugins/ai_infra/product_doc_base/server/services/package_installer/steps/fetch_artifact_versions.ts:21:10)
          at processTicksAndRejections (node:internal/process/task_queues:95:5)
          at Object.<anonymous> (/Users/pgayvallet/DEV/workspaces/elastic/kibana/x-pack/plugins/ai_infra/product_doc_base/server/services/package_installer/steps/fetch_artifact_versions.test.ts:119:5))"
    `);
  });

  it('throws an error if the response is not valid xml', async () => {
    mockResponse('some plain text');

    await expect(fetchArtifactVersions({ artifactRepositoryUrl })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "Non-whitespace before first tag.
      Line: 0
      Column: 1
      Char: s"
    `);
  });
});

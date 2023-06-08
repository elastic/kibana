/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import type { estypes } from '@elastic/elasticsearch';

import type { FleetFileClientInterface, HapiReadableStream } from './types';
import type { FleetFile } from './types';
import type { HostUploadedFileMetadata } from './types';

export const createFleetFilesClientMock = (): jest.Mocked<FleetFileClientInterface> => {
  const fleetFile = createFleetFileMock();

  return {
    get: jest.fn(async (_) => fleetFile),
    create: jest.fn(async (_, agents) => Object.assign(fleetFile, { agents })),
    update: jest.fn(async (_, __) => fleetFile),
    delete: jest.fn(),
    doesFileHaveData: jest.fn().mockReturnValue(Promise.resolve(true)),
    download: jest.fn(async (_) => {
      return {
        stream: Readable.from(['test']),
        fileName: 'foo.txt',
        mimeType: 'text/plain',
      };
    }),
  };
};

export const createFleetFileMock = (): FleetFile => {
  return {
    id: '123-456-789',
    actionId: '321-654',
    agents: ['111-222'],
    name: 'foo.txt',
    status: 'READY',
    mimeType: 'text/plain',
    size: 45632,
    sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
    created: '2023-05-12T19:47:33.702Z',
  };
};

export const createFromHostEsSearchResponseMock =
  (): estypes.SearchResponse<HostUploadedFileMetadata> => {
    return {
      took: 3,
      timed_out: false,
      _shards: {
        total: 2,
        successful: 2,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 1,
          relation: 'eq',
        },
        max_score: 0,
        hits: [
          {
            _index: '.fleet-files-foo-000001',
            _id: '123',
            _score: 1.0,
            _source: {
              action_id: '83484393-ddba-4f3c-9c7e-f492ee198a85',
              agent_id: 'eef9254d-f3ed-4518-889f-18714bd6cec1',
              src: 'endpoint',
              upload_id: 'da2da88f-4e0a-486d-9261-e89927a297d3',
              upload_start: 1674492651278,
              contents: [
                {
                  accessed: '2023-01-23 11:44:43.764000018Z',
                  created: '1969-12-31 19:00:00.000000000Z',
                  directory: '/home/ubuntu/elastic-agent-8.7.0-SNAPSHOT-linux-arm64/',
                  file_extension: '.txt',
                  file_name: 'NOTICE.txt',
                  gid: 1000,
                  inode: 259388,
                  mode: '0644',
                  mountpoint: '/',
                  mtime: '2023-01-22 08:38:58.000000000Z',
                  path: '/home/ubuntu/elastic-agent-8.7.0-SNAPSHOT-linux-arm64/NOTICE.txt',
                  sha256: '065bf83eb2060d30277faa481b2b165c69484d1be1046192eb03f088e9402056',
                  size: 946667,
                  target_path: '',
                  type: 'file',
                  uid: 1000,
                },
              ],
              file: {
                ChunkSize: 4194304,
                Status: 'READY',
                attributes: ['archive', 'compressed'],
                compression: 'deflate',
                extension: 'zip',
                hash: {
                  sha256: 'e5441eb2bb8a774783d4ff4690153832688bd546c878e953acc3da089ac05d06',
                },
                mime_type: 'application/zip',
                name: 'upload.zip',
                size: 64395,
                type: 'file',
              },
              host: {
                hostname: 'endpoint10',
              },
              transithash: {
                sha256: 'a0d6d6a2bb73340d4a0ed32b2a46272a19dd111427770c072918aed7a8565010',
              },
            },
          },
        ],
      },
    };
  };

export const createHapiReadableStreamMock = (): HapiReadableStream => {
  const readable = Readable.from(['test']) as HapiReadableStream;
  readable.hapi = {
    filename: 'foo.txt',
    headers: {
      'content-type': 'application/text',
    },
  };

  return readable;
};

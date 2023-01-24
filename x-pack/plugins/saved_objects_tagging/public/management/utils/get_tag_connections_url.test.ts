/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getTagConnectionsUrl } from './get_tag_connections_url';
import { TagWithRelations } from '../../../common/types';

const createTag = (name: string): TagWithRelations => ({
  id: 'tag-id',
  name,
  description: '',
  color: '#FF0088',
  relationCount: 42,
});

const basePath = '/my-base-path';

describe('getTagConnectionsUrl', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract({ basePath });
  });

  it('appends the basePath to the generated url', () => {
    const tag = createTag('myTag');
    expect(getTagConnectionsUrl(tag, httpMock.basePath)).toMatchInlineSnapshot(
      `"/my-base-path/app/management/kibana/objects?initialQuery=tag%3A(%22myTag%22)"`
    );
  });

  it('escapes the query', () => {
    const tag = createTag('tag with spaces');
    expect(getTagConnectionsUrl(tag, httpMock.basePath)).toMatchInlineSnapshot(
      `"/my-base-path/app/management/kibana/objects?initialQuery=tag%3A(%22tag%20with%20spaces%22)"`
    );
  });
});

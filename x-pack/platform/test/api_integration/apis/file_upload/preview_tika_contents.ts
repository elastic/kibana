/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { pdfBase64 } from './pdf_base64';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  async function runRequest(base64File: string, expectedResponseCode: number = 200) {
    const { body } = await supertest
      .post(`/internal/file_upload/preview_tika_contents`)
      .set('kbn-xsrf', 'kibana')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .send({ base64File })
      .expect(expectedResponseCode);

    return body;
  }
  const expectedResponse = {
    date: '2010-12-01T13:33:24Z',
    content_type: 'application/pdf',
    author: 'John',
    format: 'application/pdf; version=1.5',
    modified: '2010-12-01T13:33:24Z',
    language: 'en',
    creator_tool: 'Microsoft® Word 2010',
    content: 'This is a test PDF file',
    content_length: 28,
  };

  describe('POST /internal/file_upload/preview_tika_content', () => {
    it('should return the text content from the file', async () => {
      const resp = await runRequest(pdfBase64);

      expect(resp).to.eql(expectedResponse);
    });

    it('should fail to return text when bad data is sent', async () => {
      await runRequest('bad data', 500);
    });
  });
};

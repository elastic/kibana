/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SingleFileAttachmentMetadataRt,
  FileAttachmentMetadataRt,
  BulkDeleteFileAttachmentsRequestRt,
} from './files';

describe('Files', () => {
  describe('SingleFileAttachmentMetadataRt', () => {
    const defaultRequest = {
      created: '2020-02-19T23:06:33.798Z',
      extension: 'png',
      mimeType: 'image/png',
      name: 'my-super-cool-screenshot',
    };

    it('has expected attributes in request', () => {
      const query = SingleFileAttachmentMetadataRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SingleFileAttachmentMetadataRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
  describe('FileAttachmentMetadataRt', () => {
    const defaultRequest = {
      created: '2020-02-19T23:06:33.798Z',
      extension: 'png',
      mimeType: 'image/png',
      name: 'my-super-cool-screenshot',
    };

    it('has expected attributes in request', () => {
      const query = FileAttachmentMetadataRt.decode({ files: [defaultRequest] });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          files: [
            {
              ...defaultRequest,
            },
          ],
        },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = FileAttachmentMetadataRt.decode({ files: [{ ...defaultRequest, foo: 'bar' }] });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          files: [
            {
              ...defaultRequest,
            },
          ],
        },
      });
    });
  });
  describe('BulkDeleteFileAttachmentsRequestRt', () => {
    it('has expected attributes in request', () => {
      const query = BulkDeleteFileAttachmentsRequestRt.decode({ ids: ['abc', 'xyz'] });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ids: ['abc', 'xyz'] },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = BulkDeleteFileAttachmentsRequestRt.decode({ ids: ['abc', 'xyz'], foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ids: ['abc', 'xyz'] },
      });
    });
  });
});

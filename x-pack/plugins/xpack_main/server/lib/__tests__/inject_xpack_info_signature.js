/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import expect from 'expect.js';
import { injectXPackInfoSignature } from '../inject_xpack_info_signature';

describe('injectXPackInfoSignature()', () => {
  class MockErrorResponse extends Error {
    constructor() {
      super();
      this.output = {
        headers: {}
      };

      this.headers = {};
    }
  }

  let mockReply;
  let mockXPackInfo;
  beforeEach(() => {
    mockXPackInfo = sinon.stub({
      isAvailable() {},
      getSignature() {},
      refreshNow() {}
    });

    mockReply = sinon.stub({
      continue() {}
    });
  });

  describe('error response', () => {
    it('refreshes `xpackInfo` and do not inject signature if it is not available.', async () => {
      mockXPackInfo.isAvailable.returns(true);
      mockXPackInfo.getSignature.returns('this-should-never-be-set');

      // We need this to make sure the code waits for `refreshNow` to complete before it tries
      // to access its properties.
      mockXPackInfo.refreshNow = () => {
        return new Promise((resolve) => {
          mockXPackInfo.isAvailable.returns(false);
          resolve();
        });
      };

      const mockResponse = new MockErrorResponse();
      await injectXPackInfoSignature(mockXPackInfo, { response: mockResponse }, mockReply);

      expect(mockResponse.headers).to.eql({});
      expect(mockResponse.output.headers).to.eql({});
      sinon.assert.calledOnce(mockReply.continue);
    });

    it('refreshes `xpackInfo` and injects its updated signature.', async () => {
      mockXPackInfo.isAvailable.returns(true);
      mockXPackInfo.getSignature.returns('old-signature');

      // We need this to make sure the code waits for `refreshNow` to complete before it tries
      // to access its properties.
      mockXPackInfo.refreshNow = () => {
        return new Promise((resolve) => {
          mockXPackInfo.getSignature.returns('new-signature');
          resolve();
        });
      };

      const mockResponse = new MockErrorResponse();
      await injectXPackInfoSignature(mockXPackInfo, { response: mockResponse }, mockReply);

      expect(mockResponse.headers).to.eql({});
      expect(mockResponse.output.headers).to.eql({
        'kbn-xpack-sig': 'new-signature'
      });
      sinon.assert.calledOnce(mockReply.continue);
    });
  });

  describe('non-error response', () => {
    it('do not inject signature if `xpackInfo` is not available.', async () => {
      mockXPackInfo.isAvailable.returns(false);
      mockXPackInfo.getSignature.returns('this-should-never-be-set');

      const mockResponse = { headers: {}, output: { headers: {} } };
      await injectXPackInfoSignature(mockXPackInfo, { response: mockResponse }, mockReply);

      expect(mockResponse.headers).to.eql({});
      expect(mockResponse.output.headers).to.eql({});
      sinon.assert.notCalled(mockXPackInfo.refreshNow);
      sinon.assert.calledOnce(mockReply.continue);
    });

    it('injects signature if `xpackInfo` is available.', async () => {
      mockXPackInfo.isAvailable.returns(true);
      mockXPackInfo.getSignature.returns('available-signature');

      const mockResponse = { headers: {}, output: { headers: {} } };
      await injectXPackInfoSignature(mockXPackInfo, { response: mockResponse }, mockReply);

      expect(mockResponse.headers).to.eql({
        'kbn-xpack-sig': 'available-signature'
      });
      expect(mockResponse.output.headers).to.eql({});
      sinon.assert.notCalled(mockXPackInfo.refreshNow);
      sinon.assert.calledOnce(mockReply.continue);
    });
  });
});

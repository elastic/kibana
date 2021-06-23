/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { CancellationToken } from '../../../../common';
import { createMockLevelLogger } from '../../../test_helpers/create_mock_levellogger';
import { ScrollConfig } from '../../../types';
import { createHitIterator } from './hit_iterator';

const { asInternalUser: mockEsClient } = elasticsearchServiceMock.createClusterClient();
const mockLogger = createMockLevelLogger();
const debugLogStub = sinon.stub(mockLogger, 'debug');
const warnLogStub = sinon.stub(mockLogger, 'warn');
const errorLogStub = sinon.stub(mockLogger, 'error');

const mockSearchRequest = {};
const mockConfig: ScrollConfig = { duration: '2s', size: 123 };
let realCancellationToken = new CancellationToken();
let isCancelledStub: sinon.SinonStub<[], boolean>;

describe('hitIterator', function () {
  beforeEach(() => {
    debugLogStub.resetHistory();
    warnLogStub.resetHistory();
    errorLogStub.resetHistory();

    mockEsClient.search.mockClear();
    mockEsClient.search.mockResolvedValue({
      body: {
        _scroll_id: '123blah',
        hits: { hits: ['you found me'] },
      },
    } as any);

    mockEsClient.scroll.mockClear();
    for (let i = 0; i < 10; i++) {
      mockEsClient.scroll.mockResolvedValueOnce({
        body: {
          _scroll_id: '123blah',
          hits: { hits: ['you found me'] },
        },
      } as any);
    }
    mockEsClient.scroll.mockResolvedValueOnce({
      body: {
        _scroll_id: '123blah',
        hits: {},
      },
    } as any);

    isCancelledStub = sinon.stub(realCancellationToken, 'isCancelled');
    isCancelledStub.returns(false);
  });

  afterEach(() => {
    realCancellationToken = new CancellationToken();
  });

  it('iterates hits', async () => {
    // Begin
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockEsClient,
      mockSearchRequest,
      realCancellationToken
    );

    while (true) {
      const { done: iterationDone, value: hit } = await iterator.next();
      if (iterationDone) {
        break;
      }
      expect(hit).to.be('you found me');
    }

    expect(mockEsClient.scroll.mock.calls.length).to.be(11);
    expect(debugLogStub.callCount).to.be(13);
    expect(warnLogStub.callCount).to.be(0);
    expect(errorLogStub.callCount).to.be(0);
  });

  it('stops searches after cancellation', async () => {
    // Setup
    isCancelledStub.onFirstCall().returns(false);
    isCancelledStub.returns(true);

    // Begin
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockEsClient,
      mockSearchRequest,
      realCancellationToken
    );

    while (true) {
      const { done: iterationDone, value: hit } = await iterator.next();
      if (iterationDone) {
        break;
      }
      expect(hit).to.be('you found me');
    }

    expect(mockEsClient.scroll.mock.calls.length).to.be(1);
    expect(debugLogStub.callCount).to.be(3);
    expect(warnLogStub.callCount).to.be(1);
    expect(errorLogStub.callCount).to.be(0);

    expect(warnLogStub.firstCall.lastArg).to.be(
      'Any remaining scrolling searches have been cancelled by the cancellation token.'
    );
  });

  it('handles time out', async () => {
    // Setup
    mockEsClient.scroll.mockReset();
    mockEsClient.scroll.mockResolvedValueOnce({
      body: {
        _scroll_id: '123blah',
        hits: { hits: ['you found me'] },
      },
    } as any);
    mockEsClient.scroll.mockResolvedValueOnce({ body: { status: 404 } } as any);

    // Begin
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockEsClient,
      mockSearchRequest,
      realCancellationToken
    );

    let errorThrown = false;
    try {
      while (true) {
        const { done: iterationDone, value: hit } = await iterator.next();
        if (iterationDone) {
          break;
        }
        expect(hit).to.be('you found me');
      }
    } catch (err) {
      expect(err).to.eql(
        new Error('Expected _scroll_id in the following Elasticsearch response: {"status":404}')
      );
      errorThrown = true;
    }

    expect(mockEsClient.scroll.mock.calls.length).to.be(2);
    expect(debugLogStub.callCount).to.be(4);
    expect(warnLogStub.callCount).to.be(0);
    expect(errorLogStub.callCount).to.be(1);
    expect(errorThrown).to.be(true);
  });

  it('handles scroll id could not be cleared', async () => {
    // Setup
    mockEsClient.clearScroll.mockRejectedValueOnce({ status: 404 });

    // Begin
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockEsClient,
      mockSearchRequest,
      realCancellationToken
    );

    while (true) {
      const { done: iterationDone, value: hit } = await iterator.next();
      if (iterationDone) {
        break;
      }
      expect(hit).to.be('you found me');
    }

    expect(mockEsClient.scroll.mock.calls.length).to.be(11);
    expect(warnLogStub.callCount).to.be(1);
    expect(errorLogStub.callCount).to.be(1);
  });
});

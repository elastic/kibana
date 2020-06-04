/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { CancellationToken } from '../../../../../common';
import { LevelLogger } from '../../../../lib';
import { ScrollConfig } from '../../../../types';
import { createHitIterator } from './hit_iterator';

const mockLogger = {
  error: new Function(),
  debug: new Function(),
  warning: new Function(),
} as LevelLogger;
const debugLogStub = sinon.stub(mockLogger, 'debug');
const warnLogStub = sinon.stub(mockLogger, 'warning');
const errorLogStub = sinon.stub(mockLogger, 'error');
const mockCallEndpoint = sinon.stub();
const mockSearchRequest = {};
const mockConfig: ScrollConfig = { duration: '2s', size: 123 };
let realCancellationToken = new CancellationToken();
let isCancelledStub: sinon.SinonStub<[], boolean>;

describe('hitIterator', function () {
  beforeEach(() => {
    debugLogStub.resetHistory();
    warnLogStub.resetHistory();
    errorLogStub.resetHistory();
    mockCallEndpoint.resetHistory();
    mockCallEndpoint.resetBehavior();
    mockCallEndpoint.resolves({ _scroll_id: '123blah', hits: { hits: ['you found me'] } });
    mockCallEndpoint.onCall(11).resolves({ _scroll_id: '123blah', hits: {} });

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
      mockCallEndpoint,
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

    expect(mockCallEndpoint.callCount).to.be(13);
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
      mockCallEndpoint,
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

    expect(mockCallEndpoint.callCount).to.be(3);
    expect(debugLogStub.callCount).to.be(3);
    expect(warnLogStub.callCount).to.be(1);
    expect(errorLogStub.callCount).to.be(0);

    expect(warnLogStub.firstCall.lastArg).to.be(
      'Any remaining scrolling searches have been cancelled by the cancellation token.'
    );
  });

  it('handles time out', async () => {
    // Setup
    mockCallEndpoint.onCall(2).resolves({ status: 404 });

    // Begin
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockCallEndpoint,
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

    expect(mockCallEndpoint.callCount).to.be(4);
    expect(debugLogStub.callCount).to.be(4);
    expect(warnLogStub.callCount).to.be(0);
    expect(errorLogStub.callCount).to.be(1);
    expect(errorThrown).to.be(true);
  });
});

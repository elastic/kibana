/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { share } from 'rxjs/operators';
import { createSubscriberConcurrencyLimiter } from './rxjs_utils';

function createSpyObserver(o: Rx.Observable<any>): [Rx.Subscription, jest.Mock] {
  const spy = jest.fn();
  const observer = o.subscribe(spy);
  return [observer, spy];
}

describe('createSubscriberConcurrencyLimiter', () => {
  it('should not publish to more than n concurrent subscriber', async () => {
    const subject = new Rx.Subject<any>();
    const sharedObservable = subject.pipe(share());

    const limiter = createSubscriberConcurrencyLimiter(2);

    const [observer1, spy1] = createSpyObserver(sharedObservable.pipe(limiter()));
    const [observer2, spy2] = createSpyObserver(sharedObservable.pipe(limiter()));
    const [observer3, spy3] = createSpyObserver(sharedObservable.pipe(limiter()));
    const [observer4, spy4] = createSpyObserver(sharedObservable.pipe(limiter()));
    subject.next('test1');

    expect(spy1).toBeCalled();
    expect(spy2).toBeCalled();
    expect(spy3).not.toBeCalled();
    expect(spy4).not.toBeCalled();

    observer1.unsubscribe();
    expect(spy3).toBeCalled();
    expect(spy4).not.toBeCalled();

    observer2.unsubscribe();
    expect(spy4).toBeCalled();

    observer3.unsubscribe();
    observer4.unsubscribe();
  });
});

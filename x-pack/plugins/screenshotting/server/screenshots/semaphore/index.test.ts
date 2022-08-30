/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestScheduler } from 'rxjs/testing';
import { Semaphore } from '.';

describe('Semaphore', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      return expect(actual).toStrictEqual(expected);
    });
  });

  describe('acquire', () => {
    it('should limit the number of concurrently subscribed observables', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const semaphore = new Semaphore(2);
        const observable1 = cold('500ms a|').pipe(semaphore.acquire());
        const observable2 = cold('500ms b|').pipe(semaphore.acquire());
        const observable3 = cold('500ms c|').pipe(semaphore.acquire());

        expectObservable(observable1).toBe('500ms a|');
        expectObservable(observable2).toBe('500ms b|');
        expectObservable(observable3).toBe('1001ms c|');
      });
    });

    it('should release semaphore on unsubscription', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const semaphore = new Semaphore(2);
        const observable1 = cold('500ms a|').pipe(semaphore.acquire());
        const observable2 = cold('500ms b|').pipe(semaphore.acquire());
        const observable3 = cold('500ms c|').pipe(semaphore.acquire());

        expectObservable(observable1).toBe('500ms a|');
        expectObservable(observable2, '^ 100ms !').toBe('');
        expectObservable(observable3).toBe('601ms c|');
      });
    });

    it('should release semaphore on error', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const semaphore = new Semaphore(2);
        const observable1 = cold('500ms a|').pipe(semaphore.acquire());
        const observable2 = cold('100ms #').pipe(semaphore.acquire());
        const observable3 = cold('500ms c|').pipe(semaphore.acquire());

        expectObservable(observable1).toBe('500ms a|');
        expectObservable(observable2).toBe('100ms #');
        expectObservable(observable3).toBe('600ms c|');
      });
    });

    it('should remove from the queue on unsubscription', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const semaphore = new Semaphore(1);
        const observable1 = cold('500ms a|').pipe(semaphore.acquire());
        const observable2 = cold('500ms b').pipe(semaphore.acquire());
        const observable3 = cold('500ms c|').pipe(semaphore.acquire());

        expectObservable(observable1).toBe('500ms a|');
        expectObservable(observable2, '^ 100ms !').toBe('');
        expectObservable(observable3).toBe('1001ms c|');
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { BehaviorSubject, Observable, PartialObserver, Subscription } from 'rxjs';

export const useLatest = <Value>(value: Value) => {
  const valueRef = useRef(value);
  valueRef.current = value;
  return valueRef;
};

export const useObservable = <
  OutputValue,
  OutputObservable extends Observable<OutputValue>,
  InputValues extends Readonly<any[]>
>(
  createObservableOnce: (inputValues: Observable<InputValues>) => OutputObservable,
  inputValues: InputValues
) => {
  const [inputValues$] = useState(() => new BehaviorSubject<InputValues>(inputValues));
  const [output$] = useState(() => createObservableOnce(inputValues$));

  useEffect(() => {
    inputValues$.next(inputValues);
    // `inputValues` can't be statically analyzed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, inputValues);

  return output$;
};

export const useObservableState = <State, InitialState>(
  state$: Observable<State>,
  initialState: InitialState | (() => InitialState)
) => {
  const [latestValue, setLatestValue] = useState<State | InitialState>(initialState);
  const [latestError, setLatestError] = useState<unknown>();

  useSubscription(state$, {
    next: setLatestValue,
    error: setLatestError,
  });

  return { latestValue, latestError };
};

export const useSubscription = <InputValue>(
  input$: Observable<InputValue>,
  { next, error, complete, unsubscribe }: PartialObserver<InputValue> & { unsubscribe?: () => void }
) => {
  const latestSubscription = useRef<Subscription | undefined>();
  const latestNext = useLatest(next);
  const latestError = useLatest(error);
  const latestComplete = useLatest(complete);
  const latestUnsubscribe = useLatest(unsubscribe);

  useEffect(() => {
    const fixedUnsubscribe = latestUnsubscribe.current;

    const subscription = input$.subscribe({
      next: (value) => latestNext.current?.(value),
      error: (value) => latestError.current?.(value),
      complete: () => latestComplete.current?.(),
    });

    latestSubscription.current = subscription;

    return () => {
      subscription.unsubscribe();
      fixedUnsubscribe?.();
    };
  }, [input$, latestNext, latestError, latestComplete, latestUnsubscribe]);

  return latestSubscription.current;
};

export const tapUnsubscribe = (onUnsubscribe: () => void) => <T>(source$: Observable<T>) => {
  return new Observable<T>((subscriber) => {
    const subscription = source$.subscribe({
      next: (value) => subscriber.next(value),
      error: (error) => subscriber.error(error),
      complete: () => subscriber.complete(),
    });

    return () => {
      onUnsubscribe();
      subscription.unsubscribe();
    };
  });
};

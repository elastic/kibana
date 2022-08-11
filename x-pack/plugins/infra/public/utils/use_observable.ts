/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { BehaviorSubject, Observable, OperatorFunction, PartialObserver, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
  const [output$, next] = useBehaviorSubject(createObservableOnce, () => inputValues);

  useEffect(() => {
    next(inputValues);
    // `inputValues` can't be statically analyzed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, inputValues);

  return output$;
};

export const useBehaviorSubject = <
  InputValue,
  OutputValue,
  OutputObservable extends Observable<OutputValue>
>(
  deriveObservableOnce: (input$: Observable<InputValue>) => OutputObservable,
  createInitialValue: () => InputValue
) => {
  const [subject$] = useState(() => new BehaviorSubject<InputValue>(createInitialValue()));
  const [output$] = useState(() => deriveObservableOnce(subject$));
  return [output$, subject$.next.bind(subject$)] as const;
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
      next: (value) => {
        return latestNext.current?.(value);
      },
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

export const useOperator = <InputValue, OutputValue>(
  input$: Observable<InputValue>,
  operator: OperatorFunction<InputValue, OutputValue>
) => {
  const latestOperator = useLatest(operator);

  return useObservable(
    (inputs$) =>
      inputs$.pipe(switchMap(([currentInput$]) => latestOperator.current(currentInput$))),
    [input$] as const
  );
};

export const tapUnsubscribe =
  (onUnsubscribe: () => void) =>
  <T>(source$: Observable<T>) => {
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

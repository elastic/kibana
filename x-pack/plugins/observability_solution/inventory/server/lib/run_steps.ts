/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { Observable } from 'rxjs';

interface Step {
  label: string;
}

interface StepMap {
  [x: string]: Step;
}

type StepStatus = 'pending' | 'running' | 'completed';

export interface StepProcess<TSteps extends StepMap, TResult> {
  steps: {
    [key in keyof TSteps]: TSteps[key] & { status: StepStatus };
  };
  result?: TResult;
}

type StepCallback<TStepId> = <TReturn>(id: TStepId, cb: () => Promise<TReturn>) => Promise<TReturn>;

type RunCallback<TSteps extends StepMap, TReturn> = (options: {
  step: StepCallback<keyof TSteps>;
}) => Promise<TReturn>;

export interface StepRunner<TSteps extends StepMap> {
  run<TResult>(
    cb: ({}: { step: StepCallback<keyof StepMap> }) => Promise<TResult>
  ): Observable<StepProcess<TSteps, TResult>>;
}

export function runSteps<TSteps extends StepMap, TReturn>(
  steps: TSteps,
  run: RunCallback<TSteps, TReturn>
): Observable<StepProcess<TSteps, TReturn>> {
  type TStepProcess = StepProcess<TSteps, TReturn>;

  return new Observable<TStepProcess>((subscriber) => {
    let currentProcess: TStepProcess = {
      steps: mapValues(steps, (value, key) => ({
        ...value,
        status: 'pending' as const,
      })) as TStepProcess['steps'],
    };

    function next(cb: (prev: TStepProcess) => TStepProcess) {
      currentProcess = cb(currentProcess);
      subscriber.next(currentProcess);
    }

    subscriber.next(currentProcess);

    run({
      step: (id, cb) => {
        next((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            [id]: {
              ...prev.steps[id as keyof TSteps],
              status: 'running' as const,
            },
          },
        }));

        return cb().then((result) => {
          next((prev) => ({
            ...prev,
            steps: {
              ...prev.steps,
              [id]: {
                ...prev.steps[id as keyof TSteps],
                status: 'completed' as const,
              },
            },
          }));
          return result;
        });
      },
    })
      .then((result) => {
        next((prev) => ({ ...prev, result }));
        subscriber.complete();
      })
      .catch((err) => {
        subscriber.error(err);
      });
  });
}

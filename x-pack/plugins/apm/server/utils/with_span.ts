/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent from 'elastic-apm-node';
import asyncHooks from 'async_hooks';

type Options = {
  name: string;
  type?: string;
  subtype?: string;
  labels?: Record<string, string>;
} & Exclude<Parameters<typeof agent.startSpan>[4], undefined>;

function getOptions(optionsOrName: Options | string) {
  const options =
    typeof optionsOrName === 'string' ? { name: optionsOrName } : optionsOrName;

  return options;
}

export function withSpan<T>(
  optionsOrName: Options | string,
  cb: () => Promise<T>
): Promise<T> {
  const options = getOptions(optionsOrName);

  const { name, type, subtype, labels } = options;

  if (!agent.isStarted()) {
    return cb() as any;
  }

  const span = agent.startSpan(name);

  if (!span) {
    return cb() as any;
  }

  const resource = new asyncHooks.AsyncResource('fake_async');

  return resource.runInAsyncScope(() => {
    // @ts-ignore
    agent._instrumentation.activeSpan = span;
    if (type) {
      span.type = type;
    }
    if (subtype) {
      span.subtype = subtype;
    }

    if (labels) {
      span.addLabels(labels);
    }

    const promise = cb();

    return promise
      .then(
        (res) => {
          span.outcome = 'success';
          return res;
        },
        (err) => {
          span.outcome = 'failure';
          throw err;
        }
      )
      .finally(() => {
        span.end();
        resource.emitDestroy();
      });
  });
}

export function withApmSpan<T>(
  optionsOrName: Options | string,
  cb: () => Promise<T>
): Promise<T> {
  const options = getOptions(optionsOrName);

  const optionsWithLabels = {
    ...options,
    labels: {
      plugin: 'apm',
      ...options.labels,
    },
  };

  return withSpan(optionsWithLabels, cb);
}

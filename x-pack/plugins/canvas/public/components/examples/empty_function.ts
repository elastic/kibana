/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type LogType = 'call' | 'arguments';

interface Arguments {
  name?: string;
  log?: LogType | LogType[];
}

const logItem = (item: LogType) => {
  switch (item) {
    case 'call':
      // tslint:disable-next-line:no-console console.log is ok here
      console.log(`${name} called.`);
      return;
    case 'arguments':
      // tslint:disable-next-line:no-console console.log is ok here
      console.log(`${name} called with ${arguments}`);
      return;
  }
};

export const getEmptyFunction = ({
  name = 'EmptyFunction',
  log = 'call',
}: Arguments = {}): (() => void) => {
  const emptyFunction = () => {
    if (typeof log === 'string') {
      logItem(log);
    } else if (log) {
      log.forEach(item => logItem(item));
    }
  };
  return emptyFunction;
};

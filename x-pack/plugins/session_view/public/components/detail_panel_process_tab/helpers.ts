/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Teletype } from '../../../common/types/process_tree';

/**
 * Serialize an array of executable tuples to a copyable text.
 *
 * @param  {String[][]} executable
 * @return {String} serialized string with data of each executable
 */
export const getProcessExecutableCopyText = (executable: string[][]) => {
  try {
    return executable
      .map((execTuple) => {
        const [execCommand, eventAction] = execTuple;
        if (!execCommand || !eventAction || execTuple.length !== 2) {
          throw new Error();
        }
        return `${execCommand} ${eventAction}`;
      })
      .join(', ');
  } catch (_) {
    return '';
  }
};

/**
 * Format an array of args for display.
 *
 * @param  {String[]} args
 * @return {String} formatted string of process args
 */
export const formatProcessArgs = (args: string[]) =>
  args.length ? `[${args.map((arg) => `'${arg}'`).join(', ')}]` : '-';

/**
 * Get isInteractive boolean string from tty.
 *
 * @param  {Teletype | undefined} tty
 * @return {String} returns 'True' if tty exists, 'False' otherwise.
 */
export const getIsInterativeString = (tty: Teletype | undefined) => (!!tty ? 'True' : 'False');

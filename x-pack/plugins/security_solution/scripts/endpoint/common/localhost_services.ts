/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';

const POSSIBLE_LOCALHOST_VALUES: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '0000:0000:0000:0000:0000:0000:0000:0000',
];

export const getLocalhostRealIp = async (): Promise<string> => {
  // TODO:PT find better way to get host machine public IP

  return execa.commandSync(
    "ipconfig getifaddr `scutil --dns |awk -F'[()]' '$1~/if_index/ {print $2;exit;}'`",
    { shell: true }
  ).stdout;
};

export const isLocalhost = (hostname: string): boolean => {
  return POSSIBLE_LOCALHOST_VALUES.includes(hostname.toLowerCase());
};

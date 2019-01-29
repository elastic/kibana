/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  isSeedNodeValid,
  isSeedNodePortValid,
} from '../../../../services';

export function validateSeed(seed) {
  const errors = [];

  if (!seed) {
    return errors;
  }

  const isInvalid = !isSeedNodeValid(seed);

  if (isInvalid) {
    errors.push(i18n.translate(
      'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidCharactersMessage',
      {
        defaultMessage: `Seed node must use host:port format. Example: 127.0.0.1:9400, localhost:9400.
          Hosts can only consist of letters, numbers, and dashes.`,
      },
    ));
  }

  const isPortInvalid = !isSeedNodePortValid(seed);

  if (isPortInvalid) {
    errors.push(i18n.translate(
      'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidPortMessage',
      {
        defaultMessage: 'A port is required.',
      },
    ));
  }

  return errors;
}

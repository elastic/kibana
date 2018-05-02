/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Notifier } from 'ui/notify';

export function GateKeeperProvider(kbnUrl, esDataIsTribe) {
  const notifier = new Notifier();

  return {
    redirectAndNotifyIfTribe(message = 'Not available when using a Tribe node', path = '/management') {
      this.assertOrRedirectToPathWithMessage(!esDataIsTribe, message, path);
    },

    assertOrRedirectToPathWithMessage(assertion, message, path) {
      if (assertion) {
        return;
      }

      this.redirectToPathWithMessage(path, message);
    },

    redirectToPathWithMessage(path, message) {
      notifier.error(message);
      kbnUrl.redirect(path);
    }
  };
}

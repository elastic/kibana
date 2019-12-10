/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SagaContext } from '../../lib/saga';

export async function* withPageNavigationStatus({
  actionsAndState,
  isOnPage = function() {
    return false;
  },
}: {
  actionsAndState: SagaContext['actionsAndState'];
  isOnPage: (href: any) => boolean;
}) {
  for await (const { action, state } of actionsAndState()) {
    yield {
      action,
      state,
      href: '',
      previousHref: '',
      hrefChanged: true,
      authenticationStatusChanged: true,
      userIsOnPageAndLoggedIn: true,
      shouldInitialize: false,
    };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, CoreStart } from 'src/core/public';

import type { AnonymousAccessState } from '../../common';

const DEFAULT_ANONYMOUS_ACCESS_STATE = Object.freeze<AnonymousAccessState>({
  isEnabled: false,
  accessURLParameters: null,
});

interface StartDeps {
  core: Pick<CoreStart, 'http'>;
}

export interface AnonymousAccessServiceStart {
  getState: () => Promise<AnonymousAccessState>;
  getCapabilities: () => Promise<Capabilities>;
}

/**
 * Service that allows to retrieve application state.
 */
export class AnonymousAccessService {
  start({ core }: StartDeps): AnonymousAccessServiceStart {
    return {
      getCapabilities: () =>
        core.http.get<Capabilities>('/internal/security/anonymous_access/capabilities'),
      getState: () =>
        core.http.anonymousPaths.isAnonymous(window.location.pathname)
          ? Promise.resolve(DEFAULT_ANONYMOUS_ACCESS_STATE)
          : core.http
              .get<AnonymousAccessState>('/internal/security/anonymous_access/state')
              .catch(() => DEFAULT_ANONYMOUS_ACCESS_STATE),
    };
  }
}

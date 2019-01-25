/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n as i18nCore } from '@kbn/i18n';

let i18nCoreInstance: typeof i18nCore | null = null;

/**
 * @kbn/i18n is provided as a global module, but there's a difference between the version provided by Kibana, which is properly
 * initialized, and the one imported directly from the global module.  We need the former, as the latter, for example, won't
 * be set to the proper locale, (set in kibana.yml or the command line).
 *
 * As a result, we need to initialize our own provider before using i18n in Canvas code.  This simple singleton is here for that
 * purpose.
 */
export const i18nProvider = {
  // For simplicity in cases like testing, you can just init this Provider without parameters... but you won't have the
  // Kibana-initialized i18n runtime.
  init: (i18n: typeof i18nCore = i18nCore): typeof i18nCore => {
    if (i18nCoreInstance === null) {
      i18nCoreInstance = i18n;
    }
    return i18nCoreInstance;
  },
  getInstance: (): typeof i18nCore => {
    if (i18nCoreInstance === null) {
      throw new Error(
        'i18nProvider not initialized; you must first call `init` with an instance of `@kbn/i18n`'
      );
    }
    return i18nCoreInstance;
  },
};

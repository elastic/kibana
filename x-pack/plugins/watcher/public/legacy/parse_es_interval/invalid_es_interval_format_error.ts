/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export class InvalidEsIntervalFormatError extends Error {
  constructor(public readonly interval: string) {
    super(
      i18n.translate('xpack.watcher.data.parseEsInterval.invalidEsIntervalFormatErrorMessage', {
        defaultMessage: 'Invalid interval format: {interval}',
        values: { interval },
      })
    );

    this.name = 'InvalidEsIntervalFormatError';

    // captureStackTrace is only available in the V8 engine, so any browser using
    // a different JS engine won't have access to this method.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidEsIntervalFormatError);
    }

    // Babel doesn't support traditional `extends` syntax for built-in classes.
    // https://babeljs.io/docs/en/caveats/#classes
    Object.setPrototypeOf(this, InvalidEsIntervalFormatError.prototype);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const noopI18N = {
  translate: (content: string) => {
    /* tslint:disable */
    console.error(
      'Canvas was started without an i18n configuration from Kibana.  This string is not translated and will simply be returned: ' +
        content
    );
    /* tslint:enable */

    return content;
  },
};

export const i18n =
  typeof STUB_CANVAS_I18N !== 'undefined'
    ? STUB_CANVAS_I18N
    : typeof canvas !== 'undefined'
    ? canvas.i18n
    : noopI18N;

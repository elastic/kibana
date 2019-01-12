/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable */

import { i18n as i18nCore } from '@kbn/i18n';

export const i18n =
  typeof STUB_CANVAS_I18N !== 'undefined'
    ? STUB_CANVAS_I18N
    : typeof canvas !== 'undefined'
    ? canvas.i18n
    : i18nCore;

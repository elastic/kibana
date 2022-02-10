/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** An error message to be used when the user rejects a confirm save with duplicate title. */
export const SAVE_DUPLICATE_REJECTED = i18n.translate(
  'xpack.lens.saveDuplicateRejectedDescription',
  {
    defaultMessage: 'Save with duplicate title confirmation was rejected',
  }
);

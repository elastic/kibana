/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const IMPORT_SAVED_OBJECTS_SUCCESS = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.bulkCreateSavedObjects.bulkCreateSuccessTitle', {
    values: { totalCount },
    defaultMessage: `Following {totalCount, plural, =1 {saved object} other {saved objects}} has been imported successfully`,
  });

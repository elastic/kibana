/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getPartialImportMessage(failedFeaturesCount: number, totalFeaturesCount?: number) {
  const outOfTotalMsg =
    typeof totalFeaturesCount === 'number'
      ? i18n.translate('xpack.fileUpload.geoUploadWizard.outOfTotalMsg', {
          defaultMessage: 'of {totalFeaturesCount}',
          values: {
            totalFeaturesCount,
          },
        })
      : '';
  return i18n.translate('xpack.fileUpload.geoUploadWizard.partialImportMsg', {
    defaultMessage: 'Unable to index {failedFeaturesCount} {outOfTotalMsg} features.',
    values: {
      failedFeaturesCount,
      outOfTotalMsg,
    },
  });
}

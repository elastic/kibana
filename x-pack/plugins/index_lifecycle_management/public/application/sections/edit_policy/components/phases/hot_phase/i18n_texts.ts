/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  maximumAgeRequiredMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.maximumAgeMissingError',
    {
      defaultMessage: 'A maximum age is required.',
    }
  ),
  maximumSizeRequiredMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.maximumIndexSizeMissingError',
    {
      defaultMessage: 'A maximum index size is required.',
    }
  ),
  maximumDocumentsRequiredMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.maximumDocumentsMissingError',
    {
      defaultMessage: 'Maximum documents is required.',
    }
  ),
  rollOverConfigurationCallout: {
    title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.rolloverConfigurationError.title', {
      defaultMessage: 'Invalid rollover configuration',
    }),
    body: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.rolloverConfigurationError.body', {
      defaultMessage:
        'A value for one of maximum size, maximum documents, or maximum age is required.',
    }),
  },
};

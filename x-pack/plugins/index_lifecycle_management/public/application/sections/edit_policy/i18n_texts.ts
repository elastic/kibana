/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  editPolicy: {
    forceMergeEnabledFieldLabel: i18n.translate('xpack.indexLifecycleMgmt.forcemerge.enableLabel', {
      defaultMessage: 'Force merge data',
    }),
    maxNumSegmentsFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.forceMerge.numberOfSegmentsLabel',
      {
        defaultMessage: 'Number of segments',
      }
    ),
    setPriorityFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.indexPriorityLabel',
      {
        defaultMessage: 'Index priority (optional)',
      }
    ),
    bestCompressionFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.forcemerge.bestCompressionLabel',
      {
        defaultMessage: 'Compress stored fields',
      }
    ),
    bestCompressionFieldHelpText: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.forceMerge.bestCompressionText',
      {
        defaultMessage:
          'Use higher compression for stored fields at the cost of slower performance.',
      }
    ),
  },
};

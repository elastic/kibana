/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { FormSchema, fieldValidators } from '../../../shared_imports';
import { defaultSetPriority } from '../../constants';

import { FormInternal } from './types';
import { ifExistsNumberGreaterThanZero, rolloverThresholdsValidator } from './form_validations';
import { i18nTexts } from './i18n_texts';

const { emptyField } = fieldValidators;

export const schema: FormSchema<FormInternal> = {
  _meta: {
    hot: {
      useRollover: {
        defaultValue: true,
        label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.enableRolloverLabel', {
          defaultMessage: 'Enable rollover',
        }),
      },
      maxStorageSizeUnit: {
        defaultValue: 'gb',
      },
      maxAgeUnit: {
        defaultValue: 'd',
      },
      forceMergeEnabled: {
        label: i18nTexts.editPolicy.forceMergeEnabledFieldLabel,
      },
      bestCompression: {
        label: i18n.translate('xpack.indexLifecycleMgmt.forcemerge.bestCompressionLabel', {
          defaultMessage: 'Compress stored fields',
        }),
        helpText: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.forceMerge.bestCompressionText',
          {
            defaultMessage:
              'Use higher compression for stored fields at the cost of slower performance.',
          }
        ),
      },
    },
  },
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: {
            label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumAgeLabel', {
              defaultMessage: 'Maximum age',
            }),
            validations: [
              {
                validator: rolloverThresholdsValidator,
              },
              {
                validator: ifExistsNumberGreaterThanZero,
              },
            ],
          },
          max_docs: {
            label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumDocumentsLabel', {
              defaultMessage: 'Maximum documents',
            }),
            validations: [
              {
                validator: rolloverThresholdsValidator,
              },
              {
                validator: ifExistsNumberGreaterThanZero,
              },
            ],
            serializer: (v: string): any => (v ? parseInt(v, 10) : undefined),
          },
          max_size: {
            label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeLabel', {
              defaultMessage: 'Maximum index size',
            }),
            validations: [
              {
                validator: rolloverThresholdsValidator,
              },
              {
                validator: ifExistsNumberGreaterThanZero,
              },
            ],
          },
        },
        forcemerge: {
          max_num_segments: {
            label: i18n.translate('xpack.indexLifecycleMgmt.forceMerge.numberOfSegmentsLabel', {
              defaultMessage: 'Number of segments',
            }),
            validations: [
              {
                validator: emptyField(
                  i18n.translate(
                    'xpack.indexLifecycleMgmt.editPolicy.forcemerge.numberOfSegmentsRequiredError',
                    { defaultMessage: 'A value for number of segments is required.' }
                  )
                ),
              },
              {
                validator: ifExistsNumberGreaterThanZero,
              },
            ],
            serializer: (v: string): any => (v ? parseInt(v, 10) : undefined),
          },
        },
        set_priority: {
          priority: {
            defaultValue: defaultSetPriority as any,
            label: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.indexPriorityLabel', {
              defaultMessage: 'Index priority (optional)',
            }),
            validations: [{ validator: ifExistsNumberGreaterThanZero }],
            serializer: (v: string): any => (v ? parseInt(v, 10) : undefined),
          },
        },
      },
    },
  },
};

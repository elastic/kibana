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

const { emptyField, numberGreaterThanField } = fieldValidators;

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
      bestCompression: {
        label: i18nTexts.editPolicy.bestCompressionFieldLabel,
        helpText: i18nTexts.editPolicy.bestCompressionFieldHelpText,
      },
    },
    warm: {
      enabled: {
        defaultValue: false,
        label: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.warmPhase.activateWarmPhaseSwitchLabel',
          { defaultMessage: 'Activate warm phase' }
        ),
      },
      warmPhaseOnRollover: {
        defaultValue: true,
        label: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.moveToWarmPhaseOnRolloverLabel', {
          defaultMessage: 'Move to warm phase on rollover',
        }),
      },
      minAgeUnit: {
        defaultValue: 'd',
      },
      bestCompression: {
        label: i18nTexts.editPolicy.bestCompressionFieldLabel,
        helpText: i18nTexts.editPolicy.bestCompressionFieldHelpText,
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
            label: i18nTexts.editPolicy.maxNumSegmentsFieldLabel,
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
            label: i18nTexts.editPolicy.setPriorityFieldLabel,
            validations: [{ validator: ifExistsNumberGreaterThanZero }],
            serializer: (v: string): any => (v ? parseInt(v, 10) : undefined),
          },
        },
      },
    },
    warm: {
      min_age: {
        defaultValue: '0',
        validations: [
          {
            validator: ifExistsNumberGreaterThanZero,
          },
        ],
      },
      actions: {
        allocate: {
          number_of_replicas: {
            label: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.numberOfReplicasLabel', {
              defaultMessage: 'Number of replicas (optional)',
            }),
            validations: [
              {
                validator: ifExistsNumberGreaterThanZero,
              },
            ],
          },
        },
        shrink: {
          number_of_shards: {
            validations: [
              {
                validator: emptyField(i18nTexts.editPolicy.errors.numberRequired),
              },
              {
                validator: numberGreaterThanField({
                  message: i18nTexts.editPolicy.errors.numberGreatThan0Required,
                  than: 0,
                }),
              },
            ],
          },
        },
        forcemerge: {
          max_num_segments: {
            label: i18nTexts.editPolicy.maxNumSegmentsFieldLabel,
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
            defaultValue: '50' as any,
            label: i18nTexts.editPolicy.setPriorityFieldLabel,
            validations: [{ validator: ifExistsNumberGreaterThanZero }],
            serializer: (v: string): any => (v ? parseInt(v, 10) : undefined),
          },
        },
      },
    },
  },
};

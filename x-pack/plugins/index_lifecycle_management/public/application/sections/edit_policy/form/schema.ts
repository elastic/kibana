/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { PhaseExceptDelete, PhaseWithTiming } from '../../../../../common/types';
import { FormSchema, fieldValidators } from '../../../../shared_imports';
import { defaultIndexPriority } from '../../../constants';
import { ROLLOVER_FORM_PATHS, CLOUD_DEFAULT_REPO } from '../constants';
import { i18nTexts } from '../i18n_texts';
import {
  ifExistsNumberGreaterThanZero,
  ifExistsNumberNonNegative,
  rolloverThresholdsValidator,
  integerValidator,
  minAgeGreaterThanPreviousPhase,
} from './validations';

const rolloverFormPaths = Object.values(ROLLOVER_FORM_PATHS);

const { emptyField, numberGreaterThanField } = fieldValidators;

const serializers = {
  stringToNumber: (v: string): any => (v != null ? parseInt(v, 10) : undefined),
};

const maxNumSegmentsField = {
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
  serializer: serializers.stringToNumber,
};

export const searchableSnapshotFields = {
  snapshot_repository: {
    label: i18nTexts.editPolicy.searchableSnapshotsRepoFieldLabel,
    validations: [
      { validator: emptyField(i18nTexts.editPolicy.errors.searchableSnapshotRepoRequired) },
    ],
    // TODO: update text copy
    helpText: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshot.repositoryHelpText',
      {
        defaultMessage: 'Each phase uses the same snapshot repository.',
      }
    ),
  },
  storage: {
    label: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.searchableSnapshot.storageLabel', {
      defaultMessage: 'Storage',
    }),
    helpText: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshot.storageHelpText',
      {
        defaultMessage:
          "Type of snapshot mounted for the searchable snapshot. This is an advanced option. Only change it if you know what you're doing.",
      }
    ),
  },
};

const numberOfReplicasField = {
  label: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.numberOfReplicasLabel', {
    defaultMessage: 'Number of replicas',
  }),
  validations: [
    {
      validator: emptyField(i18nTexts.editPolicy.errors.numberRequired),
    },
    {
      validator: ifExistsNumberNonNegative,
    },
  ],
  serializer: serializers.stringToNumber,
};

const numberOfShardsField = {
  label: i18n.translate('xpack.indexLifecycleMgmt.shrink.numberOfPrimaryShardsLabel', {
    defaultMessage: 'Number of primary shards',
  }),
  defaultValue: 1,
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
  serializer: serializers.stringToNumber,
};
const shardSizeField = {
  label: i18nTexts.editPolicy.maxPrimaryShardSizeLabel,
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
  serializer: serializers.stringToNumber,
};

const getPriorityField = (phase: PhaseExceptDelete) => ({
  defaultValue: defaultIndexPriority[phase],
  label: i18nTexts.editPolicy.indexPriorityFieldLabel,
  validations: [
    {
      validator: emptyField(i18nTexts.editPolicy.errors.numberRequired),
    },
    { validator: ifExistsNumberNonNegative },
  ],
  serializer: serializers.stringToNumber,
});

const getMinAgeField = (phase: PhaseWithTiming, defaultValue?: string) => ({
  defaultValue,
  // By passing an empty array we make sure to *not* trigger the validation when the field value changes.
  // The validation will be triggered when the millisecond variant (in the _meta) is updated (in sync)
  fieldsToValidateOnChange: [],
  validations: [
    {
      validator: emptyField(i18nTexts.editPolicy.errors.numberRequired),
    },
    {
      validator: ifExistsNumberNonNegative,
    },
    {
      validator: integerValidator,
    },
    {
      validator: minAgeGreaterThanPreviousPhase(phase),
    },
  ],
});

export const getSchema = (isCloudEnabled: boolean): FormSchema => ({
  _meta: {
    hot: {
      isUsingDefaultRollover: {
        defaultValue: true,
        label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.isUsingDefaultRollover', {
          defaultMessage: 'Use recommended defaults',
        }),
      },
      customRollover: {
        enabled: {
          defaultValue: true,
          label: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.enableRolloverLabel', {
            defaultMessage: 'Enable rollover',
          }),
        },
        maxStorageSizeUnit: {
          defaultValue: 'gb',
        },
        maxPrimaryShardSizeUnit: {
          defaultValue: 'gb',
        },
        maxAgeUnit: {
          defaultValue: 'd',
        },
      },
      bestCompression: {
        label: i18nTexts.editPolicy.bestCompressionFieldLabel,
      },
      readonlyEnabled: {
        defaultValue: false,
        label: i18nTexts.editPolicy.readonlyEnabledFieldLabel,
      },
      shrink: {
        isUsingShardSize: {
          defaultValue: false,
        },
        maxPrimaryShardSizeUnits: {
          defaultValue: 'gb',
        },
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
      minAgeUnit: {
        defaultValue: 'd',
      },
      minAgeToMilliSeconds: {
        defaultValue: -1,
        fieldsToValidateOnChange: [
          'phases.warm.min_age',
          'phases.cold.min_age',
          'phases.frozen.min_age',
          'phases.delete.min_age',
        ],
      },
      bestCompression: {
        label: i18nTexts.editPolicy.bestCompressionFieldLabel,
      },
      dataTierAllocationType: {
        label: i18nTexts.editPolicy.allocationTypeOptionsFieldLabel,
      },
      allocationNodeAttribute: {
        label: i18nTexts.editPolicy.allocationNodeAttributeFieldLabel,
      },
      readonlyEnabled: {
        defaultValue: false,
        label: i18nTexts.editPolicy.readonlyEnabledFieldLabel,
      },
      shrink: {
        isUsingShardSize: {
          defaultValue: false,
        },
        maxPrimaryShardSizeUnits: {
          defaultValue: 'gb',
        },
      },
    },
    cold: {
      enabled: {
        defaultValue: false,
        label: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.coldPhase.activateColdPhaseSwitchLabel',
          { defaultMessage: 'Activate cold phase' }
        ),
      },
      readonlyEnabled: {
        defaultValue: false,
        label: i18nTexts.editPolicy.readonlyEnabledFieldLabel,
      },
      minAgeUnit: {
        defaultValue: 'd',
      },
      minAgeToMilliSeconds: {
        defaultValue: -1,
        fieldsToValidateOnChange: [
          'phases.cold.min_age',
          'phases.frozen.min_age',
          'phases.delete.min_age',
        ],
      },
      dataTierAllocationType: {
        label: i18nTexts.editPolicy.allocationTypeOptionsFieldLabel,
      },
      allocationNodeAttribute: {
        label: i18nTexts.editPolicy.allocationNodeAttributeFieldLabel,
      },
    },
    frozen: {
      enabled: {
        defaultValue: false,
        label: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.frozenPhase.activateFrozenPhaseSwitchLabel',
          { defaultMessage: 'Activate frozen phase' }
        ),
      },
      minAgeUnit: {
        defaultValue: 'd',
      },
      minAgeToMilliSeconds: {
        defaultValue: -1,
        fieldsToValidateOnChange: ['phases.frozen.min_age', 'phases.delete.min_age'],
      },
      dataTierAllocationType: {
        label: i18nTexts.editPolicy.allocationTypeOptionsFieldLabel,
      },
      allocationNodeAttribute: {
        label: i18nTexts.editPolicy.allocationNodeAttributeFieldLabel,
      },
    },
    delete: {
      enabled: {
        defaultValue: false,
        label: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.deletePhase.activateWarmPhaseSwitchLabel',
          { defaultMessage: 'Activate delete phase' }
        ),
      },
      minAgeUnit: {
        defaultValue: 'd',
      },
      minAgeToMilliSeconds: {
        defaultValue: -1,
        fieldsToValidateOnChange: ['phases.delete.min_age'],
      },
    },
    searchableSnapshot: {
      repository: {
        defaultValue: isCloudEnabled ? CLOUD_DEFAULT_REPO : '',
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
              {
                validator: integerValidator,
              },
            ],
            fieldsToValidateOnChange: rolloverFormPaths,
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
              {
                validator: integerValidator,
              },
            ],
            serializer: serializers.stringToNumber,
            fieldsToValidateOnChange: rolloverFormPaths,
          },
          max_primary_shard_size: {
            label: i18nTexts.editPolicy.maxPrimaryShardSizeLabel,
            validations: [
              {
                validator: rolloverThresholdsValidator,
              },
              {
                validator: ifExistsNumberGreaterThanZero,
              },
            ],
            fieldsToValidateOnChange: rolloverFormPaths,
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
            fieldsToValidateOnChange: rolloverFormPaths,
          },
        },
        forcemerge: {
          max_num_segments: maxNumSegmentsField,
        },
        shrink: {
          number_of_shards: numberOfShardsField,
          max_primary_shard_size: shardSizeField,
        },
        set_priority: {
          priority: getPriorityField('hot'),
        },
        searchable_snapshot: searchableSnapshotFields,
      },
    },
    warm: {
      min_age: getMinAgeField('warm'),
      actions: {
        allocate: {
          number_of_replicas: numberOfReplicasField,
        },
        shrink: {
          number_of_shards: numberOfShardsField,
          max_primary_shard_size: shardSizeField,
        },
        forcemerge: {
          max_num_segments: maxNumSegmentsField,
        },
        set_priority: {
          priority: getPriorityField('warm'),
        },
      },
    },
    cold: {
      min_age: getMinAgeField('cold'),
      actions: {
        allocate: {
          number_of_replicas: numberOfReplicasField,
        },
        set_priority: {
          priority: getPriorityField('cold'),
        },
        searchable_snapshot: searchableSnapshotFields,
      },
    },
    frozen: {
      min_age: getMinAgeField('frozen'),
      actions: {
        allocate: {
          number_of_replicas: numberOfReplicasField,
        },
        set_priority: {
          priority: getPriorityField('frozen'),
        },
        searchable_snapshot: searchableSnapshotFields,
      },
    },
    delete: {
      min_age: getMinAgeField('delete', '365'),
      actions: {
        wait_for_snapshot: {
          policy: {
            label: i18n.translate(
              'xpack.indexLifecycleMgmt.editPolicy.waitForSnapshot.snapshotPolicyFieldLabel',
              {
                defaultMessage: 'Policy name (optional)',
              }
            ),
          },
        },
      },
    },
  },
});

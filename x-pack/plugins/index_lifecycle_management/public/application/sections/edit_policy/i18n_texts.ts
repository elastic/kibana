/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  editPolicy: {
    shrinkLabel: i18n.translate('xpack.indexLifecycleMgmt.shrink.enableShrinkLabel', {
      defaultMessage: 'Shrink index',
    }),
    shrinkCountLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.shrink.configureShardCountLabel',
      {
        defaultMessage: 'Configure shard count',
      }
    ),
    shrinkSizeLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.shrink.configureShardSizeLabel',
      {
        defaultMessage: 'Configure shard size',
      }
    ),
    allowWriteAfterShrinkLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.shrink.allowWritesLabel',
      {
        defaultMessage: 'Allow writes after shrink',
      }
    ),
    rolloverOffsetsHotPhaseTiming: i18n.translate(
      'xpack.indexLifecycleMgmt.rollover.rolloverOffsetsPhaseTimingDescription',
      {
        defaultMessage:
          'How long it takes to reach the rollover criteria in the hot phase can vary.',
      }
    ),
    searchableSnapshotInHotPhase: {
      searchableSnapshotDisallowed: {
        calloutTitle: i18n.translate(
          'xpack.indexLifecycleMgmt.searchableSnapshot.disallowedCalloutTitle',
          {
            defaultMessage: 'Searchable snapshot disabled',
          }
        ),
        calloutBody: i18n.translate(
          'xpack.indexLifecycleMgmt.searchableSnapshot.disallowedCalloutBody',
          {
            defaultMessage:
              'To use searchable snapshot in this phase you must disable searchable snapshot in the hot phase.',
          }
        ),
      },
    },
    forceMergeEnabledFieldLabel: i18n.translate('xpack.indexLifecycleMgmt.forcemerge.enableLabel', {
      defaultMessage: 'Force merge data',
    }),
    readonlyEnabledFieldLabel: i18n.translate('xpack.indexLifecycleMgmt.readonlyFieldLabel', {
      defaultMessage: 'Make index read only',
    }),
    downsampleEnabledFieldLabel: i18n.translate('xpack.indexLifecycleMgmt.downsampleFieldLabel', {
      defaultMessage: 'Enable downsampling',
    }),
    downsampleIntervalFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.downsampleIntervalFieldLabel',
      {
        defaultMessage: 'Downsampling interval',
      }
    ),
    downsampleIntervalFieldUnitsLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.downsampleIntervalFieldUnitsLabel',
      {
        defaultMessage: 'Downsampling interval units',
      }
    ),
    maxNumSegmentsFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.forceMerge.numberOfSegmentsLabel',
      {
        defaultMessage: 'Number of segments',
      }
    ),
    indexPriorityFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.indexPriorityLabel',
      {
        defaultMessage: 'Index priority',
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
    allocationTypeOptionsFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.dataTierAllocation.allocationFieldLabel',
      { defaultMessage: 'Data tier options' }
    ),
    allocationNodeAttributeFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.dataTierAllocation.nodeAllocationFieldLabel',
      {
        defaultMessage: 'Select a node attribute',
      }
    ),
    searchableSnapshotsRepoFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotRepoFieldLabel',
      {
        defaultMessage: 'Snapshot repository',
      }
    ),
    searchableSnapshotsStorageFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotStorageFieldLabel',
      {
        defaultMessage: 'Searchable snapshot storage',
      }
    ),
    maxPrimaryShardSizeLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.hotPhase.maximumPrimaryShardSizeLabel',
      {
        defaultMessage: 'Maximum primary shard size',
      }
    ),
    maxPrimaryShardDocsLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.hotPhase.maximumPrimaryShardDocsLabel',
      {
        defaultMessage: 'Maximum docs in the primary shard',
      }
    ),
    maxPrimaryShardSizeUnitsLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.maximumPrimaryShardSizeAriaLabel',
      {
        defaultMessage: 'Maximum shard size units',
      }
    ),
    errors: {
      numberRequired: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.numberRequiredErrorMessage',
        {
          defaultMessage: 'A number is required.',
        }
      ),
      numberGreatThan0Required: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.numberAboveZeroRequiredError',
        {
          defaultMessage: 'Only numbers above 0 are allowed.',
        }
      ),
      integerRequired: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.integerRequiredError',
        {
          defaultMessage: 'Only integers are allowed.',
        }
      ),
      maximumAgeRequiredMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.maximumAgeMissingError',
        {
          defaultMessage: 'A maximum age is required.',
        }
      ),
      maximumSizeRequiredMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.maximumIndexSizeMissingError',
        {
          defaultMessage: 'A maximum index size is required.',
        }
      ),
      maximumDocumentsRequiredMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.maximumDocumentsMissingError',
        {
          defaultMessage: 'Maximum documents is required.',
        }
      ),
      maximumPrimaryShardSizeRequiredMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.maximumPrimaryShardSizeMissingError',
        {
          defaultMessage: 'A maximum primary shard size is required',
        }
      ),
      maximumPrimaryShardDocsRequiredMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.maximumPrimaryShardDocsMissingError',
        {
          defaultMessage: 'Maximum documents in the primary shard is required',
        }
      ),
      rollOverConfigurationCallout: {
        title: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.errors.rolloverConfigurationError.title',
          {
            defaultMessage: 'Invalid rollover configuration',
          }
        ),
        body: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.errors.rolloverConfigurationError.body',
          {
            defaultMessage:
              'A value for one of maximum primary shard size, maximum documents, maximum age or maximum index size is required.',
          }
        ),
      },
      nonNegativeNumberRequired: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.nonNegativeNumberRequiredError',
        {
          defaultMessage: 'Only non-negative numbers are allowed.',
        }
      ),
      policyNameContainsInvalidChars: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.errors.policyNameContainsInvalidCharsError',
        {
          defaultMessage: 'A policy name cannot contain spaces or commas.',
        }
      ),
      policyNameAlreadyUsedErrorMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.policyNameAlreadyUsedError',
        {
          defaultMessage: 'That policy name is already used.',
        }
      ),
      policyNameMustBeDifferentErrorMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.differentPolicyNameRequiredError',
        {
          defaultMessage: 'The policy name must be different.',
        }
      ),
      policyNameRequiredMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.policyNameRequiredError',
        {
          defaultMessage: 'A policy name is required.',
        }
      ),
      policyNameStartsWithUnderscoreErrorMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.policyNameStartsWithUnderscoreError',
        {
          defaultMessage: 'A policy name cannot start with an underscore.',
        }
      ),
      policyNameTooLongErrorMessage: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.policyNameTooLongError',
        {
          defaultMessage: 'A policy name cannot be longer than 255 bytes.',
        }
      ),
      searchableSnapshotRepoRequired: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotRepoRequiredError',
        {
          defaultMessage: 'A snapshot repository name is required.',
        }
      ),
    },
    titles: {
      hot: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.hotPhase.hotPhaseTitle', {
        defaultMessage: 'Hot phase',
      }),
      warm: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseTitle', {
        defaultMessage: 'Warm phase',
      }),
      cold: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseTitle', {
        defaultMessage: 'Cold phase',
      }),
      frozen: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.frozenPhase.frozenPhaseTitle', {
        defaultMessage: 'Frozen phase',
      }),
      delete: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseTitle', {
        defaultMessage: 'Delete phase',
      }),
    },
    descriptions: {
      hot: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.hotPhase.hotPhaseDescription', {
        defaultMessage:
          'Store your most recent, most frequently-searched data in the hot tier. The hot tier provides the best indexing and search performance by using the most powerful, expensive hardware.',
      }),
      warm: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescription', {
        defaultMessage:
          'Move data to the warm tier when you are still likely to search it, but infrequently need to update it. The warm tier is optimized for search performance over indexing performance.',
      }),
      cold: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseDescription', {
        defaultMessage:
          'Move data to the cold tier when you are searching it less often and don’t need to update it. The cold tier is optimized for cost savings over search performance.',
      }),
      frozen: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.frozenPhase.frozenPhaseDescription',
        {
          defaultMessage:
            'Move data to the frozen tier for long term retention. The frozen tier provides the most cost-effective way store your data and still be able to search it.',
        }
      ),
      delete: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescription',
        {
          defaultMessage: 'Delete data you no longer need.',
        }
      ),
    },
  },
};

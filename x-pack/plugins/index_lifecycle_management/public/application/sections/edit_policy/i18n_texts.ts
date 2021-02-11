/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  editPolicy: {
    shrinkLabel: i18n.translate('xpack.indexLifecycleMgmt.shrink.indexFieldLabel', {
      defaultMessage: 'Shrink index',
    }),
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
    searchableSnapshotsFieldLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotFieldLabel',
      {
        defaultMessage: 'Searchable snapshot repository',
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
              'A value for one of maximum size, maximum documents, or maximum age is required.',
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
      delete: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseTitle', {
        defaultMessage: 'Delete data',
      }),
    },
    descriptions: {
      hot: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.hotPhase.hotPhaseDescription', {
        defaultMessage:
          'You store and query your data on hot nodes, your most performant hardware. Highest search speed for the biggest cost.',
      }),
      warm: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescription', {
        defaultMessage:
          'Your data is read-only and you query it on warm nodes, less performant hardware. Slightly slower search for the smaller cost.',
      }),
      cold: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseDescription', {
        defaultMessage:
          'You query your data less frequently and move it to cold nodes, your significantly less performant hardware. Slower search for the cheapest cost.',
      }),
      delete: i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescription',
        {
          defaultMessage:
            'You no longer need your data. You can define when it is safe to delete it.',
        }
      ),
    },
  },
};

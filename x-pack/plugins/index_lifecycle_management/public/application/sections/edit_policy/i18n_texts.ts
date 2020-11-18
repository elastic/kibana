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
        defaultMessage: 'Searchable snapshot',
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
  },
};

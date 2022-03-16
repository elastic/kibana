/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConditionEntryField } from '@kbn/securitysolution-utils';

export const DETAILS_HEADER = i18n.translate('xpack.securitySolution.blocklists.details.header', {
  defaultMessage: 'Details',
});

export const DETAILS_HEADER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.blocklists.details.header.description',
  {
    defaultMessage: 'Add a blocklist to prevent selected applications from running on your hosts.',
  }
);

export const NAME_LABEL = i18n.translate('xpack.securitySolution.blocklists.name.label', {
  defaultMessage: 'Name',
});

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.blocklists.description.label',
  {
    defaultMessage: 'Description',
  }
);

export const CONDITIONS_HEADER = i18n.translate(
  'xpack.securitySolution.blocklists.conditions.header',
  {
    defaultMessage: 'Conditions',
  }
);

export const CONDITIONS_HEADER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.blocklists.conditions.header.description',
  {
    defaultMessage:
      'Select an operating system and add conditions. Availability of conditions may depend on your chosen OS.',
  }
);

export const SELECT_OS_LABEL = i18n.translate('xpack.securitySolution.blocklists.os.label', {
  defaultMessage: 'Select operating system',
});

export const FIELD_LABEL = i18n.translate('xpack.securitySolution.blocklists.field.label', {
  defaultMessage: 'Field',
});

export const OPERATOR_LABEL = i18n.translate('xpack.securitySolution.blocklists.operator.label', {
  defaultMessage: 'Operator',
});

export const VALUE_LABEL = i18n.translate('xpack.securitySolution.blocklists.value.label', {
  defaultMessage: 'Value',
});

export const CONDITION_FIELD_TITLE: { [K in ConditionEntryField]: string } = {
  [ConditionEntryField.HASH]: i18n.translate('xpack.securitySolution.blocklists.entry.field.hash', {
    defaultMessage: 'Hash',
  }),
  [ConditionEntryField.PATH]: i18n.translate('xpack.securitySolution.blocklists.entry.field.path', {
    defaultMessage: 'Path',
  }),
  [ConditionEntryField.SIGNER]: i18n.translate(
    'xpack.securitySolution.blocklists.entry.field.signature',
    { defaultMessage: 'Signature' }
  ),
};

export const CONDITION_FIELD_DESCRIPTION: { [K in ConditionEntryField]: string } = {
  [ConditionEntryField.HASH]: i18n.translate(
    'xpack.securitySolution.blocklists.entry.field.description.hash',
    { defaultMessage: 'md5, sha1, or sha256' }
  ),
  [ConditionEntryField.PATH]: i18n.translate(
    'xpack.securitySolution.blocklists.entry.field.description.path',
    { defaultMessage: 'The full path of the application' }
  ),
  [ConditionEntryField.SIGNER]: i18n.translate(
    'xpack.securitySolution.blocklists.entry.field.description.signature',
    { defaultMessage: 'The signer of the application' }
  ),
};

export const POLICY_SELECT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.blocklists.policyAssignmentSectionDescription',
  {
    defaultMessage:
      'Assign this blocklist globally across all policies, or assign it to specific policies.',
  }
);

export const ERRORS = {
  NAME_REQUIRED: i18n.translate('xpack.securitySolution.blocklists.errors.name.required', {
    defaultMessage: 'Name is required',
  }),
  VALUE_REQUIRED: i18n.translate('xpack.securitySolution.blocklists.errors.values.required', {
    defaultMessage: 'Field entry must have a value',
  }),
  INVALID_HASH: i18n.translate('xpack.securitySolution.blocklists.errors.values.invalidHash', {
    defaultMessage: 'Invalid hash value',
  }),
  INVALID_PATH: i18n.translate('xpack.securitySolution.blocklists.errors.values.invalidPath', {
    defaultMessage: 'Path may be formed incorrectly; verify value',
  }),
  WILDCARD_PRESENT: i18n.translate(
    'xpack.securitySolution.blocklists.errors.values.wildcardPresent',
    {
      defaultMessage: "A wildcard in the filename will affect the endpoint's performance",
    }
  ),
};

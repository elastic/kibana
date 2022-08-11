/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LAST_UPDATED = i18n.translate('xpack.securitySolution.artifactCard.lastUpdated', {
  defaultMessage: 'Last updated',
});

export const CREATED = i18n.translate('xpack.securitySolution.artifactCard.created', {
  defaultMessage: 'Created',
});

export const LAST_UPDATED_BY = i18n.translate('xpack.securitySolution.artifactCard.lastUpdatedBy', {
  defaultMessage: 'Updated by',
});

export const CREATED_BY = i18n.translate('xpack.securitySolution.artifactCard.createdBy', {
  defaultMessage: 'Created by',
});

export const GLOBAL_EFFECT_SCOPE = i18n.translate(
  'xpack.securitySolution.artifactCard.globalEffectScope',
  {
    defaultMessage: 'Applied globally',
  }
);

export const POLICY_EFFECT_SCOPE = (policyCount = 0) => {
  return i18n.translate('xpack.securitySolution.artifactCard.policyEffectScope', {
    defaultMessage: 'Applied to {count} {count, plural, one {policy} other {policies}}',
    values: {
      count: policyCount,
    },
  });
};

export const POLICY_EFFECT_SCOPE_TITLE = (policyCount = 0) =>
  i18n.translate('xpack.securitySolution.artifactCard.policyEffectScope.title', {
    defaultMessage: 'Applied to the following {count, plural, one {policy} other {policies}}',
    values: {
      count: policyCount,
    },
  });

export const CONDITION_OPERATOR_TYPE_MATCH = i18n.translate(
  'xpack.securitySolution.artifactCard.conditions.matchOperator',
  {
    defaultMessage: 'IS',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_MATCH = i18n.translate(
  'xpack.securitySolution.artifactCard.conditions.matchOperator.not',
  {
    defaultMessage: 'IS NOT',
  }
);

export const CONDITION_OPERATOR_TYPE_WILDCARD_MATCHES = i18n.translate(
  'xpack.securitySolution.artifactCard.conditions.wildcardMatchesOperator',
  {
    defaultMessage: 'MATCHES',
  }
);

export const CONDITION_OPERATOR_TYPE_NESTED = i18n.translate(
  'xpack.securitySolution.artifactCard.conditions.nestedOperator',
  {
    defaultMessage: 'has',
  }
);

export const CONDITION_OPERATOR_TYPE_MATCH_ANY = i18n.translate(
  'xpack.securitySolution.artifactCard.conditions.matchAnyOperator',
  {
    defaultMessage: 'is one of',
  }
);

export const CONDITION_OPERATOR_TYPE_NOT_MATCH_ANY = i18n.translate(
  'xpack.securitySolution.artifactCard.conditions.matchAnyOperator.not',
  {
    defaultMessage: 'is not one of',
  }
);

export const CONDITION_OPERATOR_TYPE_EXISTS = i18n.translate(
  'xpack.securitySolution.artifactCard.conditions.existsOperator',
  {
    defaultMessage: 'exists',
  }
);

export const CONDITION_OPERATOR_TYPE_LIST = i18n.translate(
  'xpack.securitySolution.artifactCard.conditions.listOperator',
  {
    defaultMessage: 'included in',
  }
);

export const CONDITION_OS = i18n.translate('xpack.securitySolution.artifactCard.conditions.os', {
  defaultMessage: 'OS',
});

export const CONDITION_AND = i18n.translate('xpack.securitySolution.artifactCard.conditions.and', {
  defaultMessage: 'AND',
});

export const OS_WINDOWS = i18n.translate('xpack.securitySolution.artifactCard.conditions.windows', {
  defaultMessage: 'Windows',
});

export const OS_LINUX = i18n.translate('xpack.securitySolution.artifactCard.conditions.linux', {
  defaultMessage: 'Linux',
});

export const OS_MAC = i18n.translate('xpack.securitySolution.artifactCard.conditions.macos', {
  defaultMessage: 'Mac',
});

export const EXPAND_ACTION = i18n.translate(
  'xpack.securitySolution.artifactExpandableCard.expand',
  {
    defaultMessage: 'Expand',
  }
);

export const COLLAPSE_ACTION = i18n.translate(
  'xpack.securitySolution.artifactExpandableCard.collpase',
  {
    defaultMessage: 'Collapse',
  }
);

export const SHOW_COMMENTS_LABEL = (count: number = 0) =>
  i18n.translate('xpack.securitySolution.artifactCard.comments.label.show', {
    defaultMessage: 'Show comments ({count})',
    values: { count },
  });

export const HIDE_COMMENTS_LABEL = (count: number = 0) =>
  i18n.translate('xpack.securitySolution.artifactCard.comments.label.hide', {
    defaultMessage: 'Hide comments ({count})',
    values: { count },
  });

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.artifactMinifiedCard.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

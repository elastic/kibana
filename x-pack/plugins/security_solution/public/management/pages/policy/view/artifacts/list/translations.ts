/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POLICY_ARTIFACT_LIST_LABELS = Object.freeze({
  listTotalItemCountMessage: (totalItemsCount: number): string =>
    i18n.translate('xpack.securitySolution.endpoint.policy.artifacts.list.totalItemCount', {
      defaultMessage: 'Showing {totalItemsCount, plural, one {# artifact} other {# artifacts}}',
      values: { totalItemsCount },
    }),
  listFullDetailsActionTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.fullDetailsAction',
    { defaultMessage: 'View full details' }
  ),
  listRemoveActionTitle: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeAction',
    { defaultMessage: 'Remove from policy' }
  ),
  listRemoveActionNotAllowedMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.removeActionNotAllowed',
    {
      defaultMessage: 'Globally applied artifact cannot be removed from policy.',
    }
  ),
  listSearchPlaceholderMessage: i18n.translate(
    'xpack.securitySolution.endpoint.policy.artifacts.list.search.placeholder',
    {
      defaultMessage: `Search on the fields below: name, description, value`,
    }
  ),
});

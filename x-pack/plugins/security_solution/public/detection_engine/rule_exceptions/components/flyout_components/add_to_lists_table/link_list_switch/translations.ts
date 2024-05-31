/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LINK_LIST_SWITCH_ARIA_LABEL = (name: string) =>
  i18n.translate('xpack.securitySolution.rule_exceptions.addToListTable.linkListSwitch.ariaLabel', {
    values: { name },
    defaultMessage: 'Link "{name}"',
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SecuritySolutionLinkAnchor } from '../../../../../common/components/links';
import { getRuleDetailsTabUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { RuleDetailTabs } from '../../../../../detections/pages/detection_engine/rules/details';
import { SecurityPageName } from '../../../../../../common/constants';
import type { Rule } from '../../../../../detections/containers/detection_engine/rules/types';

import * as i18n from './translations';

export const getAddToRulesTableColumns = () => [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    'data-test-subj': 'ruleNameCell',
  },
  {
    name: 'Actions',
    actions: [
      {
        'data-test-subj': 'ruleAction-view',
        render: (rule: Rule) => {
          return (
            <SecuritySolutionLinkAnchor
              data-test-subj="ruleName"
              deepLinkId={SecurityPageName.rules}
              path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.alerts)}
              external
            >
              {i18n.VIEW_RULE_DETAIL_ACTION}
            </SecuritySolutionLinkAnchor>
          );
        },
      },
    ],
  },
];

export const getRulesSchema = () => ({
  fields: {
    name: {
      type: 'string',
    },
    rule_id: {
      type: 'string',
    },
    tags: {
      type: 'string',
    },
  },
});

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
import { PopoverItems } from '../../../../../common/components/popover_items';
import type { RuleReferenceSchema } from '../../../../../../common/detection_engine/schemas/response';
import * as i18n from './translations';

export const getAddToListsTableColumns = () => [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    'data-test-subj': 'exceptionListNameCell',
  },
  {
    field: 'references',
    name: '# of rules linked to',
    sortable: false,
    'data-test-subj': 'exceptionListRulesLinkedToIdCell',
    render: (references: RuleReferenceSchema[]) => {
      if (references.length === 0) return '0';

      const renderItem = (reference: RuleReferenceSchema, i: number) => (
        <SecuritySolutionLinkAnchor
          data-test-subj="ruleName"
          deepLinkId={SecurityPageName.rules}
          path={getRuleDetailsTabUrl(reference.id, RuleDetailTabs.alerts)}
          external
        >
          {reference.name}
        </SecuritySolutionLinkAnchor>
      );

      return (
        <PopoverItems
          items={references}
          popoverButtonTitle={references.length.toString()}
          dataTestPrefix="ruleReferences"
          renderItem={renderItem}
        />
      );
    },
  },
  {
    name: 'Actions',
    actions: [
      {
        'data-test-subj': 'exceptionListRulesActionCell',
        render: (rule: Rule) => {
          return (
            <SecuritySolutionLinkAnchor
              data-test-subj="exceptionListRulesActionCell-link"
              deepLinkId={SecurityPageName.rules}
              path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.alerts)}
              external
            >
              {i18n.VIEW_LIST_DETAIL_ACTION}
            </SecuritySolutionLinkAnchor>
          );
        },
      },
    ],
  },
];

export const getListsSchema = () => ({
  fields: {
    name: {
      type: 'string',
    },
    list_id: {
      type: 'string',
    },
  },
});

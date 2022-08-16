/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, KueryNode, nodeBuilder, nodeTypes } from '@kbn/es-query';
import { RuleStatus } from '../../../types';

export const mapFiltersToKueryNode = ({
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
  searchText,
}: {
  typesFilter?: string[];
  actionTypesFilter?: string[];
  tagsFilter?: string[];
  ruleExecutionStatusesFilter?: string[];
  ruleStatusesFilter?: RuleStatus[];
  searchText?: string;
}): KueryNode | null => {
  const filterKueryNode = [];

  if (typesFilter && typesFilter.length) {
    filterKueryNode.push(
      nodeBuilder.or(typesFilter.map((tf) => nodeBuilder.is('alert.attributes.alertTypeId', tf)))
    );
  }

  if (actionTypesFilter && actionTypesFilter.length) {
    filterKueryNode.push(
      nodeBuilder.or(
        actionTypesFilter.map((atf) =>
          fromKueryExpression(`alert.attributes.actions:{ actionTypeId: ${atf} }`)
        )
      )
    );
  }

  if (ruleExecutionStatusesFilter && ruleExecutionStatusesFilter.length) {
    filterKueryNode.push(
      nodeBuilder.or(
        ruleExecutionStatusesFilter.map((resf) =>
          nodeBuilder.is('alert.attributes.executionStatus.status', resf)
        )
      )
    );
  }

  if (ruleStatusesFilter && ruleStatusesFilter.length) {
    const snoozedFilter = nodeBuilder.or([
      fromKueryExpression('alert.attributes.muteAll: true'),
      fromKueryExpression('alert.attributes.snoozeSchedule:{ duration > 0 }'),
    ]);
    const enabledFilter = fromKueryExpression('alert.attributes.enabled: true');
    const disabledFilter = fromKueryExpression('alert.attributes.enabled: false');

    const ruleStatusesFilterKueryNode = [];

    if (ruleStatusesFilter.includes('enabled')) {
      ruleStatusesFilterKueryNode.push(enabledFilter);
    }

    if (ruleStatusesFilter.includes('disabled')) {
      ruleStatusesFilterKueryNode.push(disabledFilter);
    }

    if (ruleStatusesFilter.includes('snoozed')) {
      ruleStatusesFilterKueryNode.push(snoozedFilter);
    }

    filterKueryNode.push(nodeBuilder.or(ruleStatusesFilterKueryNode));
  }

  if (tagsFilter && tagsFilter.length) {
    filterKueryNode.push(
      nodeBuilder.or(tagsFilter.map((tag) => nodeBuilder.is('alert.attributes.tags', tag)))
    );
  }

  if (searchText && searchText !== '') {
    filterKueryNode.push(
      nodeBuilder.or([
        nodeBuilder.is('alert.attributes.name', nodeTypes.wildcard.buildNode(searchText)),
        nodeBuilder.is('alert.attributes.tags', nodeTypes.wildcard.buildNode(searchText)),
      ])
    );
  }

  return filterKueryNode.length ? nodeBuilder.and(filterKueryNode) : null;
};

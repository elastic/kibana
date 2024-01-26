/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, KueryNode, nodeBuilder, nodeTypes } from '@kbn/es-query';
import { isEmpty } from 'lodash';
import { RuleStatus } from '../../../types';

export const mapFiltersToKueryNode = ({
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleLastRunOutcomesFilter,
  ruleParamsFilter,
  ruleStatusesFilter,
  tagsFilter,
  searchText,
  kueryNode,
}: {
  typesFilter?: string[];
  actionTypesFilter?: string[];
  tagsFilter?: string[];
  ruleExecutionStatusesFilter?: string[];
  ruleLastRunOutcomesFilter?: string[];
  ruleParamsFilter?: Record<string, string | number | object>;
  ruleStatusesFilter?: RuleStatus[];
  searchText?: string;
  kueryNode?: KueryNode;
}): KueryNode | null => {
  const filterKueryNode = [];

  if (kueryNode && !isEmpty(kueryNode)) {
    filterKueryNode.push(kueryNode);
  }

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

  if (ruleLastRunOutcomesFilter && ruleLastRunOutcomesFilter.length) {
    filterKueryNode.push(
      nodeBuilder.or(
        ruleLastRunOutcomesFilter.map((resf) =>
          nodeBuilder.is('alert.attributes.lastRun.outcome', resf)
        )
      )
    );
  }

  if (ruleParamsFilter && Object.keys(ruleParamsFilter).length) {
    filterKueryNode.push(
      nodeBuilder.and(
        Object.keys(ruleParamsFilter).map((ruleParam) =>
          nodeBuilder.is(
            `alert.attributes.params.${ruleParam}`,
            String(ruleParamsFilter[ruleParam])
          )
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
    // if the searchText includes quotes, treat it as an exact match query
    const value = searchText.match(/(['"`])(.*?)\1/g)
      ? nodeTypes.literal.buildNode(searchText, true)
      : nodeTypes.wildcard.buildNode(searchText);
    filterKueryNode.push(
      nodeBuilder.or([
        nodeBuilder.is('alert.attributes.name', value),
        nodeBuilder.is('alert.attributes.tags', value),
      ])
    );
  }

  return filterKueryNode.length ? nodeBuilder.and(filterKueryNode) : null;
};

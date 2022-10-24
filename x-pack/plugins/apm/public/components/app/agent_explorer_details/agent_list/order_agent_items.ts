/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import { AgentExplorerFieldName, AgentExplorerListItem } from '../../../../../common/agent_explorer';

type SortValueGetter = (item: AgentExplorerListItem) => string | number;

const sorts: Record<Partial<AgentExplorerFieldName>, SortValueGetter> = {
  [AgentExplorerFieldName.ServiceName]: (item) =>
    item.serviceName.toLowerCase(),
  [AgentExplorerFieldName.Environments]: (item) =>
    item.environments?.join(', ').toLowerCase() ?? '',
  [AgentExplorerFieldName.AgentName]: (item) => (item.agentName ?? '').toLowerCase(),
  [AgentExplorerFieldName.AgentVersion]: (item) => item.agentVersion?.join(', ').toLowerCase() ?? '',
  [AgentExplorerFieldName.AgentLastVersion]: (item) => '',
  [AgentExplorerFieldName.AgentRepoUrl]: (item) => '',
};

export function orderAgentItems({
  items,
  primarySortField,
  sortDirection,
}: {
  items: AgentExplorerListItem[];
  primarySortField: string | undefined;
  sortDirection: 'asc' | 'desc';
}): AgentExplorerListItem[] {
  if(!primarySortField) {
    return items;
  }

  return orderBy(items, sorts[primarySortField as AgentExplorerFieldName], sortDirection);
}

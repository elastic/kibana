/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, reduce } from 'lodash';
import sqlParser from 'js-sql-parser';

import type { AgentSelection, ECSMappingOrUndefined } from '../../../common/schemas/common';

export const getOsqueryTablesFromQuery = (query: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ast: Record<string, any> | undefined;

  try {
    ast = sqlParser.parse(query)?.value;
  } catch (e) {
    return [];
  }

  if (ast?.from.type === 'TableReferences') {
    /*
      select * from routes, uptime;
    */
    if (ast.from.value.length === 1) {
      return [
        {
          name: ast.from.value[0].value.value.value,
          columns: map(ast.selectItems.value, 'value'),
        },
      ];
    }

    /*
      select i.*, p.resident_size, p.user_time, p.system_time, time.minutes as counter from osquery_info i, processes p, time where p.pid = i.pid;
    */

    return map(ast.from.value, (table) => ({
      name: table.value.value.value,
      columns: filter(ast?.selectItems.value, (item) =>
        item.value.includes(`${table.value.alias?.value ?? table.value.value.value}.`)
      ).map((column) => column.value.split('.')[1]),
    }));
  }

  return [];
};

export const getAgentSelection = (agentSelection: AgentSelection) => ({
  agents: agentSelection.agents.length,
  all_agents_selected: !!agentSelection.allAgentsSelected,
  platforms_selected: agentSelection.platformsSelected,
  policies: agentSelection.policiesSelected.length,
});

export const getEcsMapping = (ecsMapping: ECSMappingOrUndefined) =>
  reduce(
    ecsMapping,
    (acc, value, key) => {
      if (value.value) {
        acc.push({
          key,
          static: true,
        });
      }

      if (value.field) {
        acc.push({
          key,
          value: value.field,
        });
      }

      return acc;
    },
    [] as Array<{
      key: string;
      value?: string;
      static?: boolean;
    }>
  );

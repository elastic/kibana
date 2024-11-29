/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import {
  isActionType,
  isAgentType,
} from '../../../../../common/endpoint/service/response_actions/type_guards';
import type { ResponseActionType } from '../../../../../common/endpoint/service/response_actions/constants';
import {
  type ConsoleResponseActionCommands,
  EDR_COMMANDS_MAPPING,
  RESPONSE_ACTION_STATUS,
  type ResponseActionAgentType,
  type EDRActionsApiCommandNames,
  type ResponseActionStatus,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { useUrlParams } from '../../../hooks/use_url_params';
import { DEFAULT_DATE_RANGE_OPTIONS } from './hooks';

interface UrlParamsActionsLogFilters {
  agentTypes: string;
  commands: string;
  hosts: string;
  statuses: string;
  startDate: string;
  endDate: string;
  users: string;
  withOutputs: string;
  types: string;
}

interface ActionsLogFiltersFromUrlParams {
  agentTypes?: ResponseActionAgentType[];
  commands?: ConsoleResponseActionCommands[];
  hosts?: string[];
  withOutputs?: string[];
  statuses?: ResponseActionStatus[];
  startDate?: string;
  endDate?: string;
  types?: string[];
  setUrlActionsFilters: (commands: UrlParamsActionsLogFilters['commands']) => void;
  setUrlDateRangeFilters: ({ startDate, endDate }: { startDate: string; endDate: string }) => void;
  setUrlHostsFilters: (agentIds: UrlParamsActionsLogFilters['hosts']) => void;
  setUrlStatusesFilters: (statuses: UrlParamsActionsLogFilters['statuses']) => void;
  setUrlUsersFilters: (users: UrlParamsActionsLogFilters['users']) => void;
  setUrlWithOutputs: (outputs: UrlParamsActionsLogFilters['withOutputs']) => void;
  // TODO: erase this function
  // once we enable and remove responseActionsSentinelOneV1Enabled
  setUrlTypeFilters: (actionTypes: UrlParamsActionsLogFilters['types']) => void;
  setUrlTypesFilters: ({
    agentTypes,
    actionTypes,
  }: {
    agentTypes: UrlParamsActionsLogFilters['agentTypes'];
    actionTypes: UrlParamsActionsLogFilters['types'];
  }) => void;
  users?: string[];
}

type FiltersFromUrl = Pick<
  ActionsLogFiltersFromUrlParams,
  | 'agentTypes'
  | 'commands'
  | 'hosts'
  | 'withOutputs'
  | 'statuses'
  | 'users'
  | 'startDate'
  | 'endDate'
  | 'types'
>;

export const actionsLogFiltersFromUrlParams = (
  urlParams: Partial<UrlParamsActionsLogFilters>
): FiltersFromUrl => {
  const actionsLogFilters: FiltersFromUrl = {
    agentTypes: [],
    commands: [],
    hosts: [],
    statuses: [],
    startDate: DEFAULT_DATE_RANGE_OPTIONS.startDate,
    endDate: DEFAULT_DATE_RANGE_OPTIONS.endDate,
    users: [],
    withOutputs: [],
    types: [],
  };

  const urlAgentTypes = urlParams.agentTypes
    ? (String(urlParams.agentTypes).split(',') as ResponseActionAgentType[]).reduce<
        ResponseActionAgentType[]
      >((acc, curr) => {
        if (isAgentType(curr)) {
          acc.push(curr);
        }
        return acc.sort();
      }, [])
    : [];

  const urlCommands = urlParams.commands
    ? String(urlParams.commands)
        .split(',')
        .reduce<Required<ActionsLogFiltersFromUrlParams>['commands']>((acc, curr) => {
          if (
            EDR_COMMANDS_MAPPING.endpoint.includes(curr as EDRActionsApiCommandNames<'endpoint'>) ||
            curr === 'release' ||
            curr === 'processes'
          ) {
            acc.push(curr as Required<ActionsLogFiltersFromUrlParams>['commands'][number]);
          }
          return acc.sort();
        }, [])
    : [];

  const urlHosts = urlParams.hosts ? String(urlParams.hosts).split(',').sort() : [];
  const urlTypes = urlParams.types
    ? (String(urlParams.types).split(',') as ResponseActionType[]).reduce<ResponseActionType[]>(
        (acc, curr) => {
          if (isActionType(curr)) {
            acc.push(curr);
          }
          return acc.sort();
        },
        []
      )
    : [];

  const urlWithOutputs = urlParams.withOutputs
    ? String(urlParams.withOutputs).split(',').sort()
    : [];

  const urlStatuses = urlParams.statuses
    ? (String(urlParams.statuses).split(',') as ResponseActionStatus[]).reduce<
        ResponseActionStatus[]
      >((acc, curr) => {
        if (RESPONSE_ACTION_STATUS.includes(curr)) {
          acc.push(curr);
        }
        return acc.sort();
      }, [])
    : [];

  const urlUsers = urlParams.users ? String(urlParams.users).split(',').sort() : [];

  actionsLogFilters.agentTypes = urlAgentTypes.length ? urlAgentTypes : undefined;
  actionsLogFilters.commands = urlCommands.length ? urlCommands : undefined;
  actionsLogFilters.hosts = urlHosts.length ? urlHosts : undefined;
  actionsLogFilters.statuses = urlStatuses.length ? urlStatuses : undefined;
  actionsLogFilters.startDate = urlParams.startDate ? String(urlParams.startDate) : undefined;
  actionsLogFilters.endDate = urlParams.endDate ? String(urlParams.endDate) : undefined;
  actionsLogFilters.users = urlUsers.length ? urlUsers : undefined;
  actionsLogFilters.withOutputs = urlWithOutputs.length ? urlWithOutputs : undefined;
  actionsLogFilters.types = urlTypes.length ? urlTypes : undefined;

  return actionsLogFilters;
};

export const useActionHistoryUrlParams = (): ActionsLogFiltersFromUrlParams => {
  // track actions and status filters
  const location = useLocation();
  const history = useHistory();
  const { urlParams, toUrlParams } = useUrlParams();

  const getUrlActionsLogFilters = useMemo(
    () => actionsLogFiltersFromUrlParams(urlParams),
    [urlParams]
  );
  const [actionsLogFilters, setActionsLogFilters] = useState(getUrlActionsLogFilters);

  const setUrlActionsFilters = useCallback(
    (commands: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          commands: commands.length ? commands : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlHostsFilters = useCallback(
    (agentIds: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          hosts: agentIds.length ? agentIds : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlWithOutputs = useCallback(
    (actionIds: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          withOutputs: actionIds.length ? actionIds : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlStatusesFilters = useCallback(
    (statuses: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          statuses: statuses.length ? statuses : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlTypesFilters = useCallback(
    ({ agentTypes, actionTypes }: { agentTypes: string; actionTypes: string }) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          agentTypes: agentTypes.length ? agentTypes : undefined,
          types: actionTypes.length ? actionTypes : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  // TODO: erase this function
  //  once we enable responseActionsSentinelOneV1Enabled
  const setUrlTypeFilters = useCallback(
    (actionTypes: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          types: actionTypes.length ? actionTypes : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlUsersFilters = useCallback(
    (users: string) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          users: users.length ? users : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const setUrlDateRangeFilters = useCallback(
    ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          startDate: startDate.length ? startDate : undefined,
          endDate: endDate.length ? endDate : undefined,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  useEffect(() => {
    setActionsLogFilters((prevState) => {
      return {
        ...prevState,
        ...actionsLogFiltersFromUrlParams(urlParams),
      };
    });
  }, [setActionsLogFilters, urlParams]);

  return {
    ...actionsLogFilters,
    setUrlActionsFilters,
    setUrlDateRangeFilters,
    setUrlHostsFilters,
    setUrlWithOutputs,
    setUrlStatusesFilters,
    setUrlUsersFilters,
    setUrlTypeFilters,
    setUrlTypesFilters,
  };
};

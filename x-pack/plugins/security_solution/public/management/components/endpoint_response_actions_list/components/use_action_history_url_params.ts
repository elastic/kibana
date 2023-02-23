/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { ConsoleResponseActionCommands } from '../../../../../common/endpoint/service/response_actions/constants';
import {
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_STATUS,
  type ResponseActionsApiCommandNames,
  type ResponseActionStatus,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { useUrlParams } from '../../../hooks/use_url_params';

interface UrlParamsActionsLogFilters {
  commands: string;
  hosts: string;
  statuses: string;
  startDate: string;
  endDate: string;
  users: string;
}

interface ActionsLogFiltersFromUrlParams {
  commands?: ConsoleResponseActionCommands[];
  hosts?: string[];
  statuses?: ResponseActionStatus[];
  startDate?: string;
  endDate?: string;
  setUrlActionsFilters: (commands: UrlParamsActionsLogFilters['commands']) => void;
  setUrlDateRangeFilters: ({ startDate, endDate }: { startDate: string; endDate: string }) => void;
  setUrlHostsFilters: (agentIds: UrlParamsActionsLogFilters['hosts']) => void;
  setUrlStatusesFilters: (statuses: UrlParamsActionsLogFilters['statuses']) => void;
  setUrlUsersFilters: (users: UrlParamsActionsLogFilters['users']) => void;
  users?: string[];
}

type FiltersFromUrl = Pick<
  ActionsLogFiltersFromUrlParams,
  'commands' | 'hosts' | 'statuses' | 'users' | 'startDate' | 'endDate'
>;

export const actionsLogFiltersFromUrlParams = (
  urlParams: Partial<UrlParamsActionsLogFilters>
): FiltersFromUrl => {
  const actionsLogFilters: FiltersFromUrl = {
    commands: [],
    hosts: [],
    statuses: [],
    startDate: 'now-24h/h',
    endDate: 'now',
    users: [],
  };

  const urlCommands = urlParams.commands
    ? String(urlParams.commands)
        .split(',')
        .reduce<Required<ActionsLogFiltersFromUrlParams>['commands']>((acc, curr) => {
          if (
            RESPONSE_ACTION_API_COMMANDS_NAMES.includes(curr as ResponseActionsApiCommandNames) ||
            curr === 'release' ||
            curr === 'processes'
          ) {
            acc.push(curr as Required<ActionsLogFiltersFromUrlParams>['commands'][number]);
          }
          return acc.sort();
        }, [])
    : [];

  const urlHosts = urlParams.hosts ? String(urlParams.hosts).split(',').sort() : [];

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

  actionsLogFilters.commands = urlCommands.length ? urlCommands : undefined;
  actionsLogFilters.hosts = urlHosts.length ? urlHosts : undefined;
  actionsLogFilters.statuses = urlStatuses.length ? urlStatuses : undefined;
  actionsLogFilters.startDate = urlParams.startDate ? String(urlParams.startDate) : undefined;
  actionsLogFilters.endDate = urlParams.endDate ? String(urlParams.endDate) : undefined;
  actionsLogFilters.users = urlUsers.length ? urlUsers : undefined;

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
    setUrlStatusesFilters,
    setUrlUsersFilters,
  };
};

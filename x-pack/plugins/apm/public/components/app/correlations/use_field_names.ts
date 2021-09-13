/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { isRumAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useDynamicDataViewFetcher } from '../../../hooks/use_dynamic_data_view';

interface IndexPattern {
  fields: Array<{ name: string; esTypes: string[] }>;
}

export function useFieldNames() {
  const { agentName } = useApmServiceContext();
  const isRumAgent = isRumAgentName(agentName);
  const { dataView } = useDynamicDataViewFetcher();

  const [defaultFieldNames, setDefaultFieldNames] = useState(
    getDefaultFieldNames(dataView, isRumAgent)
  );

  const getSuggestions = useMemo(
    () =>
      memoize((searchValue: string) =>
        getMatchingFieldNames(dataView, searchValue)
      ),
    [dataView]
  );

  useEffect(() => {
    setDefaultFieldNames(getDefaultFieldNames(dataView, isRumAgent));
  }, [dataView, isRumAgent]);

  return { defaultFieldNames, getSuggestions };
}

function getMatchingFieldNames(
  dataView: IndexPattern | undefined,
  inputValue: string
) {
  if (!dataView) {
    return [];
  }
  return dataView.fields
    .filter(
      ({ name, esTypes }) =>
        name.startsWith(inputValue) && esTypes[0] === 'keyword' // only show fields of type 'keyword'
    )
    .map(({ name }) => name);
}

function getDefaultFieldNames(
  dataView: IndexPattern | undefined,
  isRumAgent: boolean
) {
  const labelFields = getMatchingFieldNames(dataView, 'labels.').slice(0, 6);
  return isRumAgent
    ? [
        ...labelFields,
        'user_agent.name',
        'user_agent.os.name',
        'url.original',
        ...getMatchingFieldNames(dataView, 'user.').slice(0, 6),
      ]
    : [...labelFields, 'service.version', 'service.node.name', 'host.ip'];
}

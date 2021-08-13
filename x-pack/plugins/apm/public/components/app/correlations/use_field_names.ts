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
import { useDynamicIndexPatternFetcher } from '../../../hooks/use_dynamic_index_pattern';

interface IndexPattern {
  fields: Array<{ name: string; esTypes: string[] }>;
}

export function useFieldNames() {
  const { agentMetadataDetails } = useApmServiceContext();
  const isRumAgent = isRumAgentName(agentMetadataDetails?.service?.agent.name);
  const { indexPattern } = useDynamicIndexPatternFetcher();

  const [defaultFieldNames, setDefaultFieldNames] = useState(
    getDefaultFieldNames(indexPattern, isRumAgent)
  );

  const getSuggestions = useMemo(
    () =>
      memoize((searchValue: string) =>
        getMatchingFieldNames(indexPattern, searchValue)
      ),
    [indexPattern]
  );

  useEffect(() => {
    setDefaultFieldNames(getDefaultFieldNames(indexPattern, isRumAgent));
  }, [indexPattern, isRumAgent]);

  return { defaultFieldNames, getSuggestions };
}

function getMatchingFieldNames(
  indexPattern: IndexPattern | undefined,
  inputValue: string
) {
  if (!indexPattern) {
    return [];
  }
  return indexPattern.fields
    .filter(
      ({ name, esTypes }) =>
        name.startsWith(inputValue) && esTypes[0] === 'keyword' // only show fields of type 'keyword'
    )
    .map(({ name }) => name);
}

function getDefaultFieldNames(
  indexPattern: IndexPattern | undefined,
  isRumAgent: boolean
) {
  const labelFields = getMatchingFieldNames(indexPattern, 'labels.').slice(
    0,
    6
  );
  return isRumAgent
    ? [
        ...labelFields,
        'user_agent.name',
        'user_agent.os.name',
        'url.original',
        ...getMatchingFieldNames(indexPattern, 'user.').slice(0, 6),
      ]
    : [...labelFields, 'service.version', 'service.node.name', 'host.ip'];
}

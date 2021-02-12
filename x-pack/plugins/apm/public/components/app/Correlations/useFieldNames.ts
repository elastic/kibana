/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize, take } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { ProcessorEvent } from '../../../../common/processor_event';
import { isRumAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useDynamicIndexPatternFetcher } from '../../../hooks/use_dynamic_index_pattern';

interface IndexPattern {
  fields: Array<{ name: string }>;
}

export function useFieldNames() {
  const { agentName } = useApmServiceContext();
  const isRumAgent = isRumAgentName(agentName);
  const { indexPattern } = useDynamicIndexPatternFetcher(
    ProcessorEvent.transaction
  );

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
  return indexPattern.fields.reduce(
    (acc, { name }) => (name.startsWith(inputValue) ? [...acc, name] : acc),
    [] as string[]
  );
}

function getDefaultFieldNames(
  indexPattern: IndexPattern | undefined,
  isRumAgent: boolean
) {
  return isRumAgent
    ? [
        ...take(getMatchingFieldNames(indexPattern, 'labels.'), 6),
        'user_agent.name',
        'user_agent.os.name',
        'url.original',
        ...take(getMatchingFieldNames(indexPattern, 'user.'), 6),
      ]
    : [
        ...take(getMatchingFieldNames(indexPattern, 'labels.'), 6),
        'service.version',
        'service.node.name',
        'host.ip',
      ];
}

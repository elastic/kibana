/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ProcessEvent, ProcessEventResults } from '../../../common/types/process_tree';
import { PROCESS_EVENTS_ROUTE } from '../../../common/constants';

export const useFetchSessionViewProcessEvents = (sessionEntityId: string) => {
  const { http } = useKibana<CoreStart>().services;

  return useQuery<ProcessEventResults, Error>(['sessionViewProcessEvents', sessionEntityId], () =>
    http.get<ProcessEventResults>(PROCESS_EVENTS_ROUTE, {
      query: {
        sessionEntityId,
      },
    })
  );
};

export const useParseSessionViewProcessEvents = (getData: ProcessEventResults | undefined) => {
  const [data, setData] = useState<ProcessEvent[]>([]);
  const { events, alerts } = getData || {};

  const sortEvents = (a: ProcessEvent, b: ProcessEvent) => {
    if (a['@timestamp'].valueOf() < b['@timestamp'].valueOf()) {
      return -1;
    } else if (a['@timestamp'].valueOf() > b['@timestamp'].valueOf()) {
      return 1;
    }

    return 0;
  };

  useEffect(() => {
    const eventsSource: ProcessEvent[] = (events?.hits || []).map(
      (event: any) => event._source as ProcessEvent
    );
    const alertsSource: ProcessEvent[] = (alerts?.hits || []).map((event: any) => {
      return event._source as ProcessEvent;
    });
    const all: ProcessEvent[] = eventsSource.concat(alertsSource).sort(sortEvents);
    setData(all);
  }, [events, alerts]);

  return {
    data,
  };
};

export const useSearchQuery = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const onSearch = ({ query }: EuiSearchBarOnChangeArgs) => {
    if (query) {
      setSearchQuery(query.text);
    } else {
      setSearchQuery('');
    }
  };

  return {
    searchQuery,
    onSearch,
  };
};

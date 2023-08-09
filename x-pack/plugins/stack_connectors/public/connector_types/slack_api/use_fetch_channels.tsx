/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core/public';
import { ChannelsResponse, GetChannelsResponse } from '../../../common/slack_api/types';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../../common';
import * as i18n from './translations';

interface UseFetchChannelsProps {
  authToken: string;
}

const fetchChannels = async (
  http: HttpSetup,
  newAuthToken: string
): Promise<GetChannelsResponse> => {
  return http.post<GetChannelsResponse>(
    `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_slack_api/channels`,
    {
      body: JSON.stringify({
        authToken: newAuthToken,
      }),
    }
  );
};

export function useFetchChannels(props: UseFetchChannelsProps) {
  const { authToken } = props;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return fetchChannels(http, authToken);
  };

  const onErrorFn = () => {
    toasts.addDanger(i18n.ERROR_FETCH_CHANNELS);
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['fetchChannels', authToken],
    queryFn,
    onError: onErrorFn,
    enabled: authToken.length > 0,
    refetchOnWindowFocus: false,
  });

  const channels = useMemo(() => {
    return (data?.channels ?? []).map((channel: ChannelsResponse) => ({
      label: channel.name,
    }));
  }, [data]);

  return {
    channels,
    isLoading: isLoading || isFetching,
  };
}

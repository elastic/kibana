/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAction } from '@kbn/triggers-actions-ui-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../../../common/lib/kibana/kibana_react';

export interface UseSubActionParams<P, R> {
  connectorId?: string;
  subAction: string;
  subActionParams?: P;
  disabled?: boolean;
}

export const useSubAction = <P, R>({
  connectorId,
  subAction,
  subActionParams,
  disabled = false,
  ...rest
}: UseSubActionParams<P, R>) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['useSubAction', connectorId, subAction, subActionParams],
    queryFn: ({ signal }) =>
      executeAction<R>({
        id: connectorId as string,
        params: {
          subAction,
          subActionParams,
        },
        http,
        signal,
      }),
    enabled: !disabled && !!connectorId && !!subAction,
    ...rest,
  });
};

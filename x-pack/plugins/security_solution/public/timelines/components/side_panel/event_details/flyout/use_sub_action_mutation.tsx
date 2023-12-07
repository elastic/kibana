/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeAction } from '@kbn/triggers-actions-ui-plugin/public';
import { useMutation } from '@tanstack/react-query';
import { useKibana } from '../../../../../common/lib/kibana/kibana_react';

export interface UseSubActionParams<P> {
  connectorId: string;
  subAction: string;
  subActionParams?: P;
}

export const useSubActionMutation = <P, R>({
  connectorId,
  subAction,
  subActionParams,
}: UseSubActionParams<P>) => {
  const { http } = useKibana().services;

  return useMutation({
    mutationKey: ['executeSubAction', connectorId, subAction, subActionParams],
    mutationFn: () =>
      executeAction<R>({
        id: connectorId,
        params: {
          subAction,
          subActionParams,
        },
        http,
      }),
  });
};

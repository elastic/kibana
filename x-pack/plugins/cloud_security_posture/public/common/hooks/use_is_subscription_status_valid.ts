/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SetupContext } from '../../application/setup_context';
import { isSubscriptionAllowed } from '../../../common/utils/subscription';
import { useKibana } from './use_kibana';

const SUBSCRIPTION_QUERY_KEY = 'csp_subscription_query_key';

export const useIsSubscriptionStatusValid = () => {
  const { licensing } = useKibana().services;
  const { isCloudEnabled } = useContext(SetupContext);

  return useQuery([SUBSCRIPTION_QUERY_KEY], async () => {
    const license = await licensing.refresh();
    return isSubscriptionAllowed(isCloudEnabled, license);
  });
};

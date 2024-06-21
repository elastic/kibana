/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '../hooks/use_kibana';

interface UseIsAuthorizedProps {
  connectorsRequired?: boolean;
}
const useIsAuthorized = ({ connectorsRequired }: UseIsAuthorizedProps): boolean => {
  const { capabilities } = useKibana().services.application;
  const { fleet: integrations, fleetv2: fleet, actions } = capabilities;
  if (!fleet?.all || !integrations?.all) {
    return false;
  }
  if (connectorsRequired && (!actions?.show || !actions?.execute)) {
    return false;
  }
  return true;
};

interface Options {
  connectorsRequired?: boolean;
}
export const withAuthorization = <T extends object>(
  Component: React.ComponentType<T>,
  { connectorsRequired }: Options
) =>
  React.memo(function WithAuthorization(props: T) {
    const isAuthorized = useIsAuthorized({ connectorsRequired });
    if (!isAuthorized) {
      return null;
    }
    return <Component {...props} />;
  });

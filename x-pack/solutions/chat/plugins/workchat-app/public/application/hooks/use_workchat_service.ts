/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { WorkChatServicesContext } from '../context/workchat_services_context';

export const useWorkChatServices = () => {
  const services = useContext(WorkChatServicesContext);
  if (services === undefined) {
    throw new Error(
      `WorkChatServicesContext not set. Did you wrap your component in <WorkChatServicesContext.Provider> ?`
    );
  }
  return services;
};

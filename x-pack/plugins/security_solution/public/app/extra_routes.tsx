/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { StartServices } from '../types';

export const ExtraRoutes: React.FC<{ services: StartServices }> = ({ services }) => {
  const ExtraRoutesComponent = useObservable(services.extraRoutes$);
  if (!ExtraRoutesComponent) {
    return null;
  }
  return <>{ExtraRoutesComponent}</>;
};

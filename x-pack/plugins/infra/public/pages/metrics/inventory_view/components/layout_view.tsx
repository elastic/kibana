/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSavedViewContext } from '../../../../containers/saved_view/saved_view';
import { Layout } from './layout';

export const LayoutView = () => {
  const { shouldLoadDefault, currentView } = useSavedViewContext();
  return <Layout shouldLoadDefault={shouldLoadDefault} currentView={currentView} />;
};

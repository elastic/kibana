/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { WorkChatHomeView } from '../components/home/home_view';

export const WorkChatHomePage: React.FC<{}> = () => {
  useBreadcrumb([]);
  return <WorkChatHomeView />;
};

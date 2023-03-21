/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useProfilingDependencies } from './contexts/profiling_dependencies/use_profiling_dependencies';
import { useRouteBreadcrumb } from './contexts/route_breadcrumbs_context/use_route_breadcrumb';

export const RouteBreadcrumb = ({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactElement;
}) => {
  const {
    start: { core },
  } = useProfilingDependencies();
  useRouteBreadcrumb({ title, href: core.http.basePath.prepend('/app/profiling/' + href) });

  return children;
};

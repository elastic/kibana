/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useKibanaServicesContext } from '../../../context/kibana_services/use_kibana_services_context';

export const Breadcrumb = ({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactElement;
}) => {
  const { http } = useKibanaServicesContext();
  useBreadcrumb({ title, href: http.basePath.prepend('/app/apm' + href) });

  return children;
};

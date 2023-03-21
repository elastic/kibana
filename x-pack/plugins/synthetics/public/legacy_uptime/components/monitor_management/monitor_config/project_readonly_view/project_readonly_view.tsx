/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ProjectTCPReadonlyFields } from './read_only_tcp_fields';
import { ProjectICMPReadonlyFields } from './read_only_icmp_fields';
import { ProjectHTTPReadonlyFields } from './read_only_http_fields';
import { usePolicyConfigContext } from '../../../fleet_package/contexts';
import { ProjectBrowserReadonlyFields } from './read_only_browser_fields';

const MIN_COLUMN_WRAP_WIDTH = '360px';

export const ProjectReadonlyView = () => {
  const { monitorType } = usePolicyConfigContext();

  switch (monitorType) {
    case 'browser':
      return <ProjectBrowserReadonlyFields minColumnWidth={MIN_COLUMN_WRAP_WIDTH} />;
    case 'http':
      return <ProjectHTTPReadonlyFields minColumnWidth={MIN_COLUMN_WRAP_WIDTH} />;
    case 'tcp':
      return <ProjectTCPReadonlyFields minColumnWidth={MIN_COLUMN_WRAP_WIDTH} />;
    case 'icmp':
      return <ProjectICMPReadonlyFields minColumnWidth={MIN_COLUMN_WRAP_WIDTH} />;
    default:
  }

  return <ProjectBrowserReadonlyFields minColumnWidth={MIN_COLUMN_WRAP_WIDTH} />;
};

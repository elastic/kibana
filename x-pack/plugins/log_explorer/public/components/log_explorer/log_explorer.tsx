/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScopedHistory } from '@kbn/core-application-browser';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import React, { useMemo } from 'react';
import {
  createLogExplorerProfileCustomizations,
  CreateLogExplorerProfileCustomizationsDeps,
} from '../../customizations/log_explorer_profile';

export interface CreateLogExplorerArgs extends CreateLogExplorerProfileCustomizationsDeps {
  discover: DiscoverStart;
}

export interface LogExplorerProps {
  scopedHistory: ScopedHistory;
}

export const createLogExplorer = ({
  core,
  data,
  discover: { DiscoverContainer },
}: CreateLogExplorerArgs) => {
  const customizeLogExplorer = createLogExplorerProfileCustomizations({ core, data });

  return ({ scopedHistory }: LogExplorerProps) => {
    const overrideServices = useMemo(() => ({}), []);

    return (
      <DiscoverContainer
        customize={customizeLogExplorer}
        overrideServices={overrideServices}
        scopedHistory={scopedHistory}
      />
    );
  };
};

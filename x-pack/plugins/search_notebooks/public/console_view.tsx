/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { EmbeddedConsoleView } from '@kbn/console-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import { QueryClient } from '@tanstack/react-query';

import { SearchNotebooksButton } from './components/notebooks_button';

const SearchNotebooksView = dynamic(async () => ({
  default: (await import('./components/notebooks_view')).SearchNotebooksView,
}));

export const notebooksConsoleView = (
  core: CoreStart,
  queryClient: QueryClient
): EmbeddedConsoleView => {
  return {
    ActivationButton: SearchNotebooksButton,
    ViewContent: () => <SearchNotebooksView core={core} queryClient={queryClient} />,
  };
};

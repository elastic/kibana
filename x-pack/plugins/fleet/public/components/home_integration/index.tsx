/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  TutorialDirectoryHeaderLinkComponent,
  TutorialModuleNoticeComponent,
} from 'src/plugins/home/public';
import { EuiLoadingSpinner } from '@elastic/eui';

const TutorialDirectoryHeaderLinkLazy = React.lazy(
  () => import('./tutorial_directory_header_link')
);
export const TutorialDirectoryHeaderLink: TutorialDirectoryHeaderLinkComponent = () => (
  <React.Suspense fallback={<EuiLoadingSpinner />}>
    <TutorialDirectoryHeaderLinkLazy />
  </React.Suspense>
);

const TutorialModuleNoticeLazy = React.lazy(() => import('./tutorial_module_notice'));
export const TutorialModuleNotice: TutorialModuleNoticeComponent = ({
  moduleName,
}: {
  moduleName: string;
}) => (
  <React.Suspense fallback={<EuiLoadingSpinner />}>
    <TutorialModuleNoticeLazy moduleName={moduleName} />
  </React.Suspense>
);

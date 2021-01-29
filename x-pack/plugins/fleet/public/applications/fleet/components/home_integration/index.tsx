/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import type {
  TutorialDirectoryNoticeComponent,
  TutorialDirectoryHeaderLinkComponent,
  TutorialModuleNoticeComponent,
} from 'src/plugins/home/public';
import { EuiLoadingSpinner } from '@elastic/eui';

const TutorialDirectoryNoticeLazy = React.lazy(() => import('./tutorial_directory_notice'));
export const TutorialDirectoryNotice: TutorialDirectoryNoticeComponent = () => (
  <React.Suspense fallback={<EuiLoadingSpinner />}>
    <TutorialDirectoryNoticeLazy />
  </React.Suspense>
);

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

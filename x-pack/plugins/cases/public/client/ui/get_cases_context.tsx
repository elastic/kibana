/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { lazy, Suspense } from 'react';
import type { CasesContextProps } from '../../components/cases_context';

export type GetCasesContextPropsInternal = CasesContextProps;
export type GetCasesContextProps = Omit<
  CasesContextProps,
  | 'externalReferenceAttachmentTypeRegistry'
  | 'persistableStateAttachmentTypeRegistry'
  | 'getFilesClient'
>;

const CasesProviderLazy: React.FC<{ value: GetCasesContextPropsInternal }> = lazy(
  () => import('../../components/cases_context')
);

const CasesProviderLazyWrapper = ({
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  owner,
  permissions,
  features,
  children,
  releasePhase,
  getFilesClient,
}: GetCasesContextPropsInternal & { children: ReactNode }) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <CasesProviderLazy
      value={{
        externalReferenceAttachmentTypeRegistry,
        persistableStateAttachmentTypeRegistry,
        owner,
        permissions,
        features,
        releasePhase,
        getFilesClient,
      }}
    >
      {children}
    </CasesProviderLazy>
  </Suspense>
);

CasesProviderLazyWrapper.displayName = 'CasesProviderLazyWrapper';

export const getCasesContextLazy = ({
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
  getFilesClient,
}: Pick<
  GetCasesContextPropsInternal,
  | 'externalReferenceAttachmentTypeRegistry'
  | 'persistableStateAttachmentTypeRegistry'
  | 'getFilesClient'
>): (() => React.FC<GetCasesContextProps>) => {
  const CasesProviderLazyWrapperWithRegistry: React.FC<GetCasesContextProps> = ({
    children,
    ...props
  }) => (
    <CasesProviderLazyWrapper
      {...props}
      externalReferenceAttachmentTypeRegistry={externalReferenceAttachmentTypeRegistry}
      persistableStateAttachmentTypeRegistry={persistableStateAttachmentTypeRegistry}
      getFilesClient={getFilesClient}
    >
      {children}
    </CasesProviderLazyWrapper>
  );

  CasesProviderLazyWrapperWithRegistry.displayName = 'CasesProviderLazyWrapperWithRegistry';

  return () => CasesProviderLazyWrapperWithRegistry;
};

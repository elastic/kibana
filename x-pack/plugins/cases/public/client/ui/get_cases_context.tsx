/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, ReactNode, Suspense } from 'react';
import type { FC, PropsWithChildren } from 'react';
import { CasesContextProps } from '../../components/cases_context';

export type GetCasesContextPropsInternal = CasesContextProps;
export type GetCasesContextProps = Omit<
  CasesContextProps,
  'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry'
>;

const CasesProviderLazy: FC<PropsWithChildren<{ value: GetCasesContextPropsInternal }>> = lazy(
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
}: GetCasesContextPropsInternal & { children: ReactNode }) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CasesProviderLazy
        value={{
          externalReferenceAttachmentTypeRegistry,
          persistableStateAttachmentTypeRegistry,
          owner,
          permissions,
          features,
          releasePhase,
        }}
      >
        {children}
      </CasesProviderLazy>
    </Suspense>
  );
};

CasesProviderLazyWrapper.displayName = 'CasesProviderLazyWrapper';

export const getCasesContextLazy = ({
  externalReferenceAttachmentTypeRegistry,
  persistableStateAttachmentTypeRegistry,
}: Pick<
  GetCasesContextPropsInternal,
  'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry'
>) => {
  const CasesProviderLazyWrapperWithRegistry: FC<PropsWithChildren<GetCasesContextProps>> = ({
    children,
    ...props
  }) => (
    <CasesProviderLazyWrapper
      {...props}
      externalReferenceAttachmentTypeRegistry={externalReferenceAttachmentTypeRegistry}
      persistableStateAttachmentTypeRegistry={persistableStateAttachmentTypeRegistry}
    >
      {children}
    </CasesProviderLazyWrapper>
  );

  CasesProviderLazyWrapperWithRegistry.displayName = 'CasesProviderLazyWrapperWithRegistry';

  return () => CasesProviderLazyWrapperWithRegistry;
};

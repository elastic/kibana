/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, ReactNode, Suspense } from 'react';
import { CasesContextProps } from '../../components/cases_context';

export type GetCasesContextPropsInternal = CasesContextProps;
export type GetCasesContextProps = Omit<
  CasesContextProps,
  'externalReferenceAttachmentTypeRegistry'
>;

const CasesProviderLazy: React.FC<{ value: GetCasesContextPropsInternal }> = lazy(
  () => import('../../components/cases_context')
);

const CasesProviderLazyWrapper = ({
  externalReferenceAttachmentTypeRegistry,
  owner,
  userCanCrud,
  features,
  children,
  releasePhase,
}: GetCasesContextPropsInternal & { children: ReactNode }) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CasesProviderLazy
        value={{
          externalReferenceAttachmentTypeRegistry,
          owner,
          userCanCrud,
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
}: Pick<GetCasesContextPropsInternal, 'externalReferenceAttachmentTypeRegistry'>) => {
  // eslint-disable-next-line react/display-name
  return (
    props: GetCasesContextProps & {
      children: ReactNode;
    }
  ) => (
    <CasesProviderLazyWrapper
      {...props}
      externalReferenceAttachmentTypeRegistry={externalReferenceAttachmentTypeRegistry}
    />
  );
};

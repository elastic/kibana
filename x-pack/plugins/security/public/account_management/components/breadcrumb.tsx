/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useEffect, useRef, FunctionComponent, ReactNode } from 'react';
import { EuiBreadcrumb } from '@elastic/eui';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

/**
 * Component that sets breadcrumbs and doc title based on the render tree.
 *
 * @example
 * ```typescript
 * <Breadcrumb text="Users">
 *   <Table />
 *   {showForm && (
 *     <Breadcrumb text="Create User">
 *       <Form />
 *     </Breadcrumb>
 *   )}
 * </Breadcrumb>
 * ```
 */
export const Breadcrumb: FunctionComponent<BreadcrumbProps> = ({ children, ...breadcrumb }) => (
  <Consumer>
    {(value) =>
      value ? (
        <NestedProvider breadcrumb={breadcrumb} {...value}>
          {children}
        </NestedProvider>
      ) : (
        <RootProvider breadcrumb={breadcrumb}>{children}</RootProvider>
      )
    }
  </Consumer>
);

interface BreadcrumbContext {
  parents: BreadcrumbProps[];
  onMount(breadcrumbs: BreadcrumbProps[]): void;
  onUnmount(breadcrumbs: BreadcrumbProps[]): void;
}

const { Provider, Consumer } = createContext<BreadcrumbContext | undefined>(undefined);

export interface RootProviderProps {
  breadcrumb: BreadcrumbProps;
  children: ReactNode;
}

export const RootProvider: FunctionComponent<RootProviderProps> = ({ breadcrumb, children }) => {
  const { services } = useKibana();
  const breadcrumbsRef = useRef<BreadcrumbProps[]>([]);

  const setBreadcrumbs = (breadcrumbs: BreadcrumbProps[]) => {
    breadcrumbsRef.current = breadcrumbs;
    services.chrome?.setBreadcrumbs(breadcrumbs);
    services.chrome?.docTitle.change(getDocTitle(breadcrumbs));
  };

  return (
    <NestedProvider
      parents={[]}
      breadcrumb={breadcrumb}
      onMount={(breadcrumbs) => {
        if (breadcrumbs.length > breadcrumbsRef.current.length) {
          setBreadcrumbs(breadcrumbs);
        }
      }}
      onUnmount={(breadcrumbs) => {
        if (breadcrumbs.length < breadcrumbsRef.current.length) {
          setBreadcrumbs(breadcrumbs);
        }
      }}
    >
      {children}
    </NestedProvider>
  );
};

export function getDocTitle(breadcrumbs: BreadcrumbProps[]) {
  return breadcrumbs
    .slice()
    .reverse()
    .map(({ text }) => text);
}

export const NestedProvider: FunctionComponent<RootProviderProps & BreadcrumbContext> = ({
  parents,
  onMount,
  onUnmount,
  breadcrumb,
  children,
}) => {
  const nextParents = [...parents, breadcrumb];

  useEffect(() => {
    onMount(nextParents);
    return () => onUnmount(parents);
  }, [breadcrumb.text, breadcrumb.href]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Provider value={{ parents: nextParents, onMount, onUnmount }}>{children}</Provider>;
};

export interface BreadcrumbProps extends EuiBreadcrumb {
  text: string;
}

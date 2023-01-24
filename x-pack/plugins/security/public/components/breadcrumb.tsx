/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBreadcrumb } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { createContext, useContext, useEffect, useRef } from 'react';

import type { ChromeStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface BreadcrumbsContext {
  parents: BreadcrumbProps[];
  onMount(breadcrumbs: BreadcrumbProps[]): void;
  onUnmount(breadcrumbs: BreadcrumbProps[]): void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContext | undefined>(undefined);

export interface BreadcrumbProps extends EuiBreadcrumb {
  text: string;
}

/**
 * Component that automatically sets breadcrumbs and document title based on the render tree.
 *
 * @example
 * // Breadcrumbs will be set to: "Users > Create"
 * // Document title will be set to: "Create - Users"
 *
 * ```typescript
 * <Breadcrumb text="Users">
 *   <Table />
 *   {showForm && (
 *     <Breadcrumb text="Create">
 *       <Form />
 *     </Breadcrumb>
 *   )}
 * </Breadcrumb>
 * ```
 */
export const Breadcrumb: FunctionComponent<BreadcrumbProps> = ({ children, ...breadcrumb }) => {
  const context = useContext(BreadcrumbsContext);
  const component = <InnerBreadcrumb breadcrumb={breadcrumb}>{children}</InnerBreadcrumb>;

  if (context) {
    return component;
  }

  return <BreadcrumbsProvider>{component}</BreadcrumbsProvider>;
};

export interface BreadcrumbsProviderProps {
  onChange?: BreadcrumbsChangeHandler;
}

export type BreadcrumbsChangeHandler = (breadcrumbs: BreadcrumbProps[]) => void;

/**
 * Component that can be used to define any side effects that should occur when breadcrumbs change.
 *
 * By default the breadcrumbs in application chrome are set and the document title is updated.
 *
 * @example
 * ```typescript
 * <Breadcrumbs onChange={(breadcrumbs) => setBreadcrumbs(breadcrumbs)}>
 *   <Breadcrumb text="Users" />
 * </Breadcrumbs>
 * ```
 */
export const BreadcrumbsProvider: FunctionComponent<BreadcrumbsProviderProps> = ({
  children,
  onChange,
}) => {
  const { services } = useKibana();
  const breadcrumbsRef = useRef<BreadcrumbProps[]>([]);

  const handleChange = (breadcrumbs: BreadcrumbProps[]) => {
    const newBreadcrumbs = breadcrumbs.map((item, index) => {
      if (index === breadcrumbs.length - 1) {
        return { ...item, href: undefined };
      }
      return item;
    });
    if (onChange) {
      onChange(newBreadcrumbs);
    } else if (services.chrome) {
      const setBreadcrumbs = createBreadcrumbsChangeHandler(services.chrome);
      setBreadcrumbs(newBreadcrumbs);
    }
  };

  return (
    <BreadcrumbsContext.Provider
      value={{
        parents: [],
        onMount: (breadcrumbs) => {
          if (breadcrumbs.length > breadcrumbsRef.current.length) {
            breadcrumbsRef.current = breadcrumbs;
            handleChange(breadcrumbs);
          }
        },
        onUnmount: (breadcrumbs) => {
          if (breadcrumbs.length < breadcrumbsRef.current.length) {
            breadcrumbsRef.current = breadcrumbs;
            handleChange(breadcrumbs);
          }
        },
      }}
    >
      {children}
    </BreadcrumbsContext.Provider>
  );
};

export interface InnerBreadcrumbProps {
  breadcrumb: BreadcrumbProps;
}

export const InnerBreadcrumb: FunctionComponent<InnerBreadcrumbProps> = ({
  breadcrumb,
  children,
}) => {
  const { parents, onMount, onUnmount } = useContext(BreadcrumbsContext)!;
  const nextParents = [...parents, breadcrumb];

  useEffect(() => {
    onMount(nextParents);
    return () => onUnmount(parents);
  }, [breadcrumb.text, breadcrumb.href]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BreadcrumbsContext.Provider value={{ parents: nextParents, onMount, onUnmount }}>
      {children}
    </BreadcrumbsContext.Provider>
  );
};

export function getDocTitle(breadcrumbs: BreadcrumbProps[], maxBreadcrumbs = 2) {
  return breadcrumbs
    .slice(0, maxBreadcrumbs)
    .reverse()
    .map(({ text }) => text);
}

export function createBreadcrumbsChangeHandler(
  chrome: Pick<ChromeStart, 'docTitle' | 'setBreadcrumbs'>,
  setBreadcrumbs = chrome.setBreadcrumbs
) {
  return (breadcrumbs: BreadcrumbProps[]) => {
    setBreadcrumbs(breadcrumbs);
    if (breadcrumbs.length === 0) {
      chrome.docTitle.reset();
    } else {
      chrome.docTitle.change(getDocTitle(breadcrumbs));
    }
  };
}

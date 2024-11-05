/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect } from 'react';

import { useValues } from 'kea';

import useObservable from 'react-use/lib/useObservable';

import { SEARCH_PRODUCT_NAME } from '../../../../../common/constants';
import { KibanaLogic } from '../../../shared/kibana';
import { SetSearchPlaygroundChrome } from '../../../shared/kibana_chrome/set_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { useEnterpriseSearchNav } from '../../../shared/layout';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

import { PlaygroundHeaderDocsAction } from './header_docs_action';

export type SearchPlaygroundPageTemplateProps = Omit<
  PageTemplateProps,
  'useEndpointHeaderActions'
> & {
  hasSchemaConflicts?: boolean;
  restrictWidth?: boolean;
  searchApplicationName?: string;
};

export const SearchPlaygroundPageTemplate: React.FC<SearchPlaygroundPageTemplateProps> = ({
  children,
  pageChrome,
  pageViewTelemetry,
  searchApplicationName,
  hasSchemaConflicts,
  restrictWidth = true,
  ...pageTemplateProps
}) => {
  const navItems = useEnterpriseSearchNav();

  const { renderHeaderActions, getChromeStyle$ } = useValues(KibanaLogic);
  const chromeStyle = useObservable(getChromeStyle$(), 'classic');

  useLayoutEffect(() => {
    renderHeaderActions(PlaygroundHeaderDocsAction);

    return () => {
      renderHeaderActions();
    };
  }, []);

  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        items: chromeStyle === 'classic' ? navItems : undefined,
        name: SEARCH_PRODUCT_NAME,
      }}
      restrictWidth={restrictWidth}
      setPageChrome={pageChrome && <SetSearchPlaygroundChrome trail={pageChrome} />}
      useEndpointHeaderActions={false}
    >
      {pageViewTelemetry && (
        <SendEnterpriseSearchTelemetry action="viewed" metric={pageViewTelemetry} />
      )}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect } from 'react';

import classNames from 'classnames';
import { useValues } from 'kea';

import { KibanaPageTemplate, KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

import { FlashMessages } from '../flash_messages';
import { KibanaLogic } from '../kibana';
import { BreadcrumbTrail } from '../kibana_chrome/generate_breadcrumbs';
import { Loading } from '../loading';

import './page_template.scss';
import { EndpointsHeaderAction } from './endpoints_header_action';

/*
 * EnterpriseSearchPageTemplateWrapper is a light wrapper for KibanaPageTemplate (which
 * is a light wrapper for EuiPageTemplate). It should contain only concerns shared
 * between both AS & WS, which should have their own AppSearchPageTemplate &
 * WorkplaceSearchPageTemplate sitting on top of this template (:nesting_dolls:),
 * which in turn manages individual product-specific concerns (e.g. side navs, telemetry, etc.)
 *
 * @see https://github.com/elastic/kibana/tree/main/src/plugins/kibana_react/public/page_template
 * @see https://elastic.github.io/eui/#/layout/page
 */

export type PageTemplateProps = KibanaPageTemplateProps & {
  customPageSections?: boolean; // If false, automatically wraps children in an EuiPageSection
  emptyState?: React.ReactNode;
  hideFlashMessages?: boolean;
  isLoading?: boolean;
  // Used by product-specific page templates
  pageChrome?: BreadcrumbTrail;
  pageViewTelemetry?: string;
  setPageChrome?: React.ReactNode;
  solutionNavIcon?: string;
  useEndpointHeaderActions?: boolean;
  hideEmbeddedConsole?: boolean;
};

export const EnterpriseSearchPageTemplateWrapper: React.FC<PageTemplateProps> = ({
  children,
  className,
  customPageSections,
  hideFlashMessages,
  isLoading,
  isEmptyState,
  emptyState,
  setPageChrome,
  solutionNav,
  solutionNavIcon,
  useEndpointHeaderActions = true,
  hideEmbeddedConsole = false,
  ...pageTemplateProps
}) => {
  const { renderHeaderActions, consolePlugin } = useValues(KibanaLogic);

  const hasCustomEmptyState = !!emptyState;
  const showCustomEmptyState = hasCustomEmptyState && isEmptyState;

  const navIcon = solutionNavIcon ?? 'logoEnterpriseSearch';

  useLayoutEffect(() => {
    if (useEndpointHeaderActions) {
      renderHeaderActions(EndpointsHeaderAction);
    }
    return () => {
      renderHeaderActions(undefined);
    };
  }, []);
  return (
    <KibanaPageTemplate
      {...pageTemplateProps}
      className={classNames('enterpriseSearchPageTemplate', className)}
      mainProps={{
        ...pageTemplateProps.mainProps,
        className: classNames(
          'enterpriseSearchPageTemplate__content',
          pageTemplateProps.mainProps?.className
        ),
      }}
      isEmptyState={isEmptyState && !isLoading}
      solutionNav={solutionNav && solutionNav.items ? { icon: navIcon, ...solutionNav } : undefined}
    >
      {setPageChrome}
      {!hideFlashMessages && <FlashMessages />}
      {isLoading ? (
        <Loading />
      ) : showCustomEmptyState ? (
        emptyState
      ) : customPageSections ? (
        children
      ) : (
        <KibanaPageTemplate.Section>{children}</KibanaPageTemplate.Section>
      )}
      {!hideEmbeddedConsole && consolePlugin?.EmbeddableConsole !== undefined ? (
        <consolePlugin.EmbeddableConsole />
      ) : (
        <></>
      )}
    </KibanaPageTemplate>
  );
};

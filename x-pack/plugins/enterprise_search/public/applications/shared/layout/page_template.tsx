/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import classNames from 'classnames';
import { useActions, useValues } from 'kea';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { I18nProvider } from '@kbn/i18n-react';
import { KibanaPageTemplate, KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

import { Status } from '../../../../common/types/api';

import { CreateApiKeyAPILogic } from '../../enterprise_search_overview/api/create_elasticsearch_api_key_logic';
import { CreateApiKeyFlyout } from '../api_key/create_api_key_flyout';
import { FlashMessages } from '../flash_messages';
import { HttpLogic } from '../http';
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
  ...pageTemplateProps
}) => {
  const { readOnlyMode } = useValues(HttpLogic);
  const { cloud, renderHeaderActions, user } = useValues(KibanaLogic);
  const { makeRequest: saveApiKey } = useActions(CreateApiKeyAPILogic);
  const { data: apiKey, error, status } = useValues(CreateApiKeyAPILogic);

  const hasCustomEmptyState = !!emptyState;
  const showCustomEmptyState = hasCustomEmptyState && isEmptyState;

  const navIcon = solutionNavIcon ?? 'logoEnterpriseSearch';

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const HeaderAction: React.FC<{}> = () => (
    <I18nProvider>
      <EndpointsHeaderAction isFlyoutOpen={isFlyoutOpen} setIsFlyoutOpen={setIsFlyoutOpen} />
    </I18nProvider>
  );

  if (cloud && useEndpointHeaderActions) {
    renderHeaderActions(HeaderAction);
  }
  return (
    <KibanaPageTemplate
      restrictWidth={false}
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
      {isFlyoutOpen && (
        <CreateApiKeyFlyout
          createdApiKey={apiKey}
          error={error?.body?.message}
          isLoading={status === Status.LOADING}
          onClose={() => setIsFlyoutOpen(false)}
          setApiKey={saveApiKey}
          username={user?.full_name || user?.username || ''}
        />
      )}
      {setPageChrome}
      {readOnlyMode && (
        <>
          <EuiCallOut
            color="warning"
            iconType="lock"
            title={i18n.translate('xpack.enterpriseSearch.readOnlyMode.warning', {
              defaultMessage:
                'Enterprise Search is in read-only mode. You will be unable to make changes such as creating, editing, or deleting.',
            })}
          />
          <EuiSpacer />
        </>
      )}
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
    </KibanaPageTemplate>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';
import { useValues } from 'kea';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  KibanaPageTemplate,
  KibanaPageTemplateProps,
} from '../../../../../../../src/plugins/kibana_react/public';

import { FlashMessages } from '../flash_messages';
import { HttpLogic } from '../http';
import { BreadcrumbTrail } from '../kibana_chrome/generate_breadcrumbs';
import { Loading } from '../loading';

import './page_template.scss';

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
  hideFlashMessages?: boolean;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  setPageChrome?: React.ReactNode;
  // Used by product-specific page templates
  pageChrome?: BreadcrumbTrail;
  pageViewTelemetry?: string;
};

export const EnterpriseSearchPageTemplateWrapper: React.FC<PageTemplateProps> = ({
  children,
  className,
  hideFlashMessages,
  isLoading,
  isEmptyState,
  emptyState,
  setPageChrome,
  solutionNav,
  ...pageTemplateProps
}) => {
  const { readOnlyMode } = useValues(HttpLogic);
  const hasCustomEmptyState = !!emptyState;
  const showCustomEmptyState = hasCustomEmptyState && isEmptyState;

  return (
    <KibanaPageTemplate
      restrictWidth={false}
      {...pageTemplateProps}
      className={classNames('enterpriseSearchPageTemplate', className)}
      pageContentProps={{
        ...pageTemplateProps.pageContentProps,
        className: classNames(
          'enterpriseSearchPageTemplate__content',
          pageTemplateProps.pageContentProps?.className
        ),
      }}
      isEmptyState={isEmptyState && !isLoading}
      solutionNav={solutionNav ? { icon: 'logoEnterpriseSearch', ...solutionNav } : undefined}
    >
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
      {isLoading ? <Loading /> : showCustomEmptyState ? emptyState : children}
    </KibanaPageTemplate>
  );
};

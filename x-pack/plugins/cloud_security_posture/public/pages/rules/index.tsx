/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiTextColor, EuiEmptyPrompt } from '@elastic/eui';
import * as t from 'io-ts';
import { RulesContainer, type PageUrlParams } from './rules_container';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import type { KibanaPageTemplateProps } from '../../../../../../src/plugins/kibana_react/public';
import { CspNavigationItem } from '../../common/navigation/types';
import { extractErrorMessage } from '../../../common/utils/helpers';
import { useCspIntegration } from './use_csp_integration';
import { CspPageTemplate } from '../../components/csp_page_template';

const getRulesBreadcrumbs = (name?: string): CspNavigationItem[] =>
  [allNavigationItems.benchmarks, { ...allNavigationItems.rules, name }].filter(
    (breadcrumb): breadcrumb is CspNavigationItem => !!breadcrumb.name
  );

export const Rules = ({ match: { params } }: RouteComponentProps<PageUrlParams>) => {
  const integrationInfo = useCspIntegration(params);
  const breadcrumbs = useMemo(
    // TODO: make benchmark breadcrumb navigable
    () => getRulesBreadcrumbs(integrationInfo.data?.name),
    [integrationInfo.data?.name]
  );

  useCspBreadcrumbs(breadcrumbs);

  const pageProps: KibanaPageTemplateProps = useMemo(
    () => ({
      template: integrationInfo.status !== 'success' ? 'centeredContent' : undefined,
      pageHeader: {
        bottomBorder: false, // TODO: border still shows.
        pageTitle: 'Rules',
        description: integrationInfo.data && integrationInfo.data.package && (
          <PageDescription
            text={`${integrationInfo.data.package.title}, ${integrationInfo.data.name}`}
          />
        ),
      },
    }),
    [integrationInfo.data, integrationInfo.status]
  );

  return (
    <CspPageTemplate
      {...pageProps}
      errorRender={(error) => <RulesErrorPrompt error={extractErrorBodyMessage(error)} />}
    >
      {integrationInfo.status === 'success' && <RulesContainer />}
    </CspPageTemplate>
  );
};

// react-query puts the response data on the 'error' object
const bodyError = t.type({
  body: t.type({
    message: t.string,
  }),
});

const extractErrorBodyMessage = (err: unknown) => {
  if (bodyError.is(err)) return err.body.message;
  return extractErrorMessage(err);
};

const PageDescription = ({ text }: { text: string }) => (
  <EuiTextColor color="subdued">{text}</EuiTextColor>
);

const RulesErrorPrompt = ({ error }: { error: string }) => (
  <EuiEmptyPrompt
    {...{
      color: 'danger',
      iconType: 'alert',
      title: <h2>{error}</h2>,
    }}
  />
);

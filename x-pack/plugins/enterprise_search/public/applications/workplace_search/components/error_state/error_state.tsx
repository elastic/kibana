/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { SetWorkplaceSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { ViewContentHeader } from '../shared/view_content_header';

export const ErrorState: React.FC = () => {
  return (
    <EuiPage restrictWidth>
      <SetBreadcrumbs isRoot />
      <SendTelemetry action="error" metric="cannot_connect" />

      <EuiPageBody>
        <ViewContentHeader
          title={i18n.translate('xpack.enterpriseSearch.workplaceSearch.productName', {
            defaultMessage: 'Workplace Search',
          })}
        />
        <EuiPageContent>
          <ErrorStatePrompt />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

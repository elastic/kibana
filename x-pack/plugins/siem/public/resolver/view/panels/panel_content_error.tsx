/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { CrumbInfo, StyledBreadcrumbs } from '../panel';

export const TableServiceError = memo(function ({
  errorMessage,
  pushToQueryParams,
}: {
  errorMessage: string;
  pushToQueryParams: (arg0: CrumbInfo) => unknown;
}) {
  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.error.events', {
          defaultMessage: 'Events',
        }),
        onClick: () => {
          pushToQueryParams({ crumbId: '', crumbEvent: '' });
        },
      },
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.error.error', {
          defaultMessage: 'Error',
        }),
        onClick: () => {},
      },
    ];
  }, []);
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiText textAlign="center">{errorMessage}</EuiText>
      <EuiSpacer size="l" />
      <EuiButtonEmpty
        onClick={() => {
          pushToQueryParams({ crumbId: '', crumbEvent: '' });
        }}
      >
        {i18n.translate('xpack.siem.endpoint.resolver.panel.error.goBack', {
          defaultMessage: 'Click this link to return to the list of all processes.',
        })}
      </EuiButtonEmpty>
    </>
  );
});
TableServiceError.displayName = 'TableServiceError';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { CrumbInfo, StyledBreadcrumbs } from '../panel';

/**
 * Display an error in the panel when something goes wrong and give the user a way to "retreat" back to a default state.
 *
 * @param {function} pushToQueryparams A function to update the hash value in the URL to control panel state
 * @param {string} errorMessage The message to display in the panel when something goes wrong
 */
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

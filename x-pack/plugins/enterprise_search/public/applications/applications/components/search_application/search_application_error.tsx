/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { APPLICATIONS_PLUGIN } from '../../../../../common/constants';
import { HttpError } from '../../../../../common/types/api';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { NotFoundPrompt } from '../../../shared/not_found';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

import { SEARCH_APPLICATIONS_PATH } from '../../routes';

export const SearchApplicationError: React.FC<{ error?: HttpError; notFound?: boolean }> = ({
  error,
  notFound,
}) => {
  if (notFound || error?.body?.statusCode === 404) {
    return (
      <>
        <SendEnterpriseSearchTelemetry action="error" metric="not_found" />
        <NotFoundPrompt
          backToContent={i18n.translate(
            'xpack.enterpriseSearch.searchApplications.searchApplication.notFound.action1',
            {
              defaultMessage: 'Back to Search Applications',
            }
          )}
          backToLink={SEARCH_APPLICATIONS_PATH}
          productSupportUrl={APPLICATIONS_PLUGIN.SUPPORT_URL}
        />
      </>
    );
  }
  return (
    <>
      <SendEnterpriseSearchTelemetry action="error" metric="cannot_connect" />
      <ErrorStatePrompt />
    </>
  );
};

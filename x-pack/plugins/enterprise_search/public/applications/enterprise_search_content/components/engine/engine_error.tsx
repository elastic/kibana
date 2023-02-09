/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { HttpError } from '../../../../../common/types/api';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { NotFoundPrompt } from '../../../shared/not_found';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

import { ENGINES_PATH } from '../../routes';

export const EngineError: React.FC<{ error: HttpError | undefined }> = ({ error }) => {
  if (error?.body?.statusCode === 404) {
    return (
      <>
        <SendEnterpriseSearchTelemetry action="error" metric="not_found" />
        <NotFoundPrompt
          backToContent={i18n.translate('xpack.enterpriseSearch.engines.engine.notFound.action1', {
            defaultMessage: 'Back to Engines',
          })}
          backToLink={ENGINES_PATH}
          productSupportUrl={ENTERPRISE_SEARCH_CONTENT_PLUGIN.SUPPORT_URL}
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

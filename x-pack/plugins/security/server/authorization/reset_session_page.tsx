/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error no definitions in component folder
import { EuiButton, EuiButtonEmpty } from '@elastic/eui/lib/components/button';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IBasePath } from 'src/core/server';

import { PromptPage } from '../prompt_page';

export function ResetSessionPage({
  logoutUrl,
  buildNumber,
  basePath,
}: {
  logoutUrl: string;
  buildNumber: number;
  basePath: IBasePath;
}) {
  return (
    <PromptPage
      buildNumber={buildNumber}
      basePath={basePath}
      scriptPaths={['/internal/security/reset_session_page.js']}
      title={i18n.translate('xpack.security.resetSession.title', {
        defaultMessage: 'You do not have permission to access the requested page',
      })}
      body={
        <p>
          <FormattedMessage
            id="xpack.security.resetSession.description"
            defaultMessage="Either go back to the previous page or log in as a different user."
          />
        </p>
      }
      actions={[
        <EuiButton color="primary" fill href={logoutUrl} data-test-subj="ResetSessionButton">
          <FormattedMessage
            id="xpack.security.resetSession.logOutButtonLabel"
            defaultMessage="Log in as different user"
          />
        </EuiButton>,
        <EuiButtonEmpty id="goBackButton">
          <FormattedMessage
            id="xpack.security.resetSession.goBackButtonLabel"
            defaultMessage="Go back"
          />
        </EuiButtonEmpty>,
      ]}
    />
  );
}

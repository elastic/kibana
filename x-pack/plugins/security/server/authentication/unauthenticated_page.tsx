/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error no definitions in component folder
import { EuiButton } from '@elastic/eui/lib/components/button';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IBasePath } from 'src/core/server';

import { PromptPage } from '../prompt_page';

interface Props {
  originalURL: string;
  buildNumber: number;
  basePath: IBasePath;
}

export function UnauthenticatedPage({ basePath, originalURL, buildNumber }: Props) {
  return (
    <PromptPage
      buildNumber={buildNumber}
      basePath={basePath}
      title={i18n.translate('xpack.security.unauthenticated.pageTitle', {
        defaultMessage: "We couldn't log you in",
      })}
      body={
        <p>
          <FormattedMessage
            id="xpack.security.unauthenticated.errorDescription"
            defaultMessage="We hit an authentication error. Please check your credentials and try again. If you still can't log in, contact your system administrator."
          />
        </p>
      }
      actions={[
        <EuiButton color="primary" fill href={originalURL} data-test-subj="logInButton">
          <FormattedMessage
            id="xpack.security.unauthenticated.loginButtonLabel"
            defaultMessage="Log in"
          />
        </EuiButton>,
      ]}
    />
  );
}

export function renderUnauthenticatedPage(props: Props) {
  return renderToStaticMarkup(<UnauthenticatedPage {...props} />);
}

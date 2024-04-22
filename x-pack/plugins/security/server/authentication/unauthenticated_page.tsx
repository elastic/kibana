/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { IBasePath } from '@kbn/core/server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { IStaticAssets } from '@kbn/core-http-server';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { PromptPage } from '../prompt_page';

interface Props {
  originalURL: string;
  basePath: IBasePath;
  staticAssets: IStaticAssets;
  customBranding: CustomBranding;
}

export function UnauthenticatedPage({
  basePath,
  originalURL,
  staticAssets,
  customBranding,
}: Props) {
  return (
    <PromptPage
      basePath={basePath}
      staticAssets={staticAssets}
      title={i18n.translate('xpack.security.unauthenticated.pageTitle', {
        defaultMessage: 'We hit an authentication error',
      })}
      body={
        <p>
          <FormattedMessage
            id="xpack.security.unauthenticated.errorDescription"
            defaultMessage="Try logging in again, and if the problem persists, contact your system administrator."
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
      customBranding={customBranding}
    />
  );
}

export function renderUnauthenticatedPage(props: Props) {
  return renderToStaticMarkup(<UnauthenticatedPage {...props} />);
}

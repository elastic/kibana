/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// @ts-expect-error no definitions in component folder
import { EuiButton, EuiButtonEmpty } from '@elastic/eui/lib/components/button';
// @ts-expect-error no definitions in component folder
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui/lib/components/page';
// @ts-expect-error no definitions in component folder
import { EuiEmptyPrompt } from '@elastic/eui/lib/components/empty_prompt';
// @ts-expect-error no definitions in component folder
import { appendIconComponentCache } from '@elastic/eui/lib/components/icon/icon';
// @ts-expect-error no definitions in component folder
import { icon as EuiIconAlert } from '@elastic/eui/lib/components/icon/assets/alert';

import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Fonts } from '../../../../../src/core/server/rendering/views/fonts';

// Preload the alert icon used by `EuiEmptyPrompt` to ensure that it's loaded
// in advance the first time this page is rendered server-side. If not, the
// icon svg wouldn't contain any paths the first time the page was rendered.
appendIconComponentCache({
  alert: EuiIconAlert,
});

export function ResetSessionPage({
  logoutUrl,
  styleSheetPaths,
  basePath,
}: {
  logoutUrl: string;
  styleSheetPaths: string[];
  basePath: string;
}) {
  const uiPublicUrl = `${basePath}/ui`;
  return (
    <html lang={i18n.getLocale()}>
      <head>
        {styleSheetPaths.map((path) => (
          <link href={path} rel="stylesheet" key={path} />
        ))}
        <Fonts url={uiPublicUrl} />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={`${uiPublicUrl}/favicons/apple-touch-icon.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={`${uiPublicUrl}/favicons/favicon-32x32.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={`${uiPublicUrl}/favicons/favicon-16x16.png`}
        />
        <link rel="manifest" href={`${uiPublicUrl}/favicons/manifest.json`} />
        <link
          rel="mask-icon"
          color="#e8488b"
          href={`${uiPublicUrl}/favicons/safari-pinned-tab.svg`}
        />
        <link rel="shortcut icon" href={`${uiPublicUrl}/favicons/favicon.ico`} />
        <script src={`${basePath}/internal/security/reset_session_page.js`} />
        <meta name="msapplication-config" content={`${uiPublicUrl}/favicons/browserconfig.xml`} />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <I18nProvider>
          <EuiPage style={{ minHeight: '100vh' }}>
            <EuiPageBody>
              <EuiPageContent verticalPosition="center" horizontalPosition="center">
                <EuiEmptyPrompt
                  iconType="alert"
                  iconColor="danger"
                  title={
                    <h2>
                      <FormattedMessage
                        id="xpack.security.resetSession.title"
                        defaultMessage="You do not have permission to access the requested page"
                      />
                    </h2>
                  }
                  body={
                    <p>
                      <FormattedMessage
                        id="xpack.security.resetSession.description"
                        defaultMessage="Either go back to the previous page or log in as a different user."
                      />
                    </p>
                  }
                  actions={[
                    <EuiButton
                      color="primary"
                      fill
                      href={logoutUrl}
                      data-test-subj="ResetSessionButton"
                    >
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
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </I18nProvider>
      </body>
    </html>
  );
}

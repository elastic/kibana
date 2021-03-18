/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error no definitions in component folder
import { EuiButton } from '@elastic/eui/lib/components/button';
// @ts-expect-error no definitions in component folder
import { EuiEmptyPrompt } from '@elastic/eui/lib/components/empty_prompt';
// @ts-expect-error no definitions in component folder
import { icon as EuiIconAlert } from '@elastic/eui/lib/components/icon/assets/alert';
// @ts-expect-error no definitions in component folder
import { appendIconComponentCache } from '@elastic/eui/lib/components/icon/icon';
// @ts-expect-error no definitions in component folder
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui/lib/components/page';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import * as UiSharedDeps from '@kbn/ui-shared-deps';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Fonts } from '../../../../../src/core/server/rendering/views/fonts';

// Preload the alert icon used by `EuiEmptyPrompt` to ensure that it's loaded
// in advance the first time this page is rendered server-side. If not, the
// icon svg wouldn't contain any paths the first time the page was rendered.
appendIconComponentCache({
  alert: EuiIconAlert,
});

interface Params {
  basePath: string;
  buildNumber: number;
  logoutUrl: string;
}

export function UnauthorizedPage({ basePath, buildNumber, logoutUrl }: Params) {
  const bundlePath = `${basePath}/${buildNumber}/bundles`;
  const uiPublicUrl = `${basePath}/ui`;
  const styleSheetPaths = [
    `${bundlePath}/kbn-ui-shared-deps/${UiSharedDeps.baseCssDistFilename}`,
    `${bundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightCssDistFilename}`,
    `${basePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
    `${basePath}/ui/legacy_light_theme.css`,
  ];

  return (
    <html lang={i18n.getLocale()}>
      <head>
        {styleSheetPaths.map((path) => (
          <link href={path} rel="stylesheet" key={path} />
        ))}
        <Fonts url={uiPublicUrl} />
        {/* The alternate icon is a fallback for Safari which does not yet support SVG favicons */}
        <link rel="alternate icon" type="image/png" href={`${uiPublicUrl}/favicons/favicon.png`} />
        <link rel="icon" type="image/svg+xml" href={`${uiPublicUrl}/favicons/favicon.svg`} />
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <I18nProvider>
          <EuiPage paddingSize="none" style={{ minHeight: '100vh' }}>
            <EuiPageBody>
              <EuiPageContent verticalPosition="center" horizontalPosition="center">
                <EuiEmptyPrompt
                  iconType="alert"
                  iconColor="danger"
                  title={
                    <h2>
                      <FormattedMessage
                        id="xpack.security.resetSession.title"
                        defaultMessage="Unauthorized"
                      />
                    </h2>
                  }
                  body={
                    <p>
                      <FormattedMessage
                        id="xpack.security.resetSession.description"
                        defaultMessage="Please log in as a different user."
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

export function renderUnauthorizedPage(params: Params) {
  return renderToStaticMarkup(<UnauthorizedPage {...params} />);
}

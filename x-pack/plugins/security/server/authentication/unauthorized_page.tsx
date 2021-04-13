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
import type { IBasePath } from 'src/core/server';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Fonts } from '../../../../../src/core/server/rendering/views/fonts';

// Preload the alert icon used by `EuiEmptyPrompt` to ensure that it's loaded
// in advance the first time this page is rendered server-side. If not, the
// icon svg wouldn't contain any paths the first time the page was rendered.
appendIconComponentCache({
  alert: EuiIconAlert,
});

interface Props {
  originalURL: string;
  buildNumber: number;
  basePath: IBasePath;
}

export function UnauthorizedPage({ basePath, originalURL, buildNumber }: Props) {
  const uiPublicURL = `${basePath.serverBasePath}/ui`;
  const title = i18n.translate('xpack.security.unauthorized.title', {
    defaultMessage: 'You could not log in. Please try again.',
  });

  const regularBundlePath = `${basePath.serverBasePath}/${buildNumber}/bundles`;
  const styleSheetPaths = [
    `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.baseCssDistFilename}`,
    `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightCssDistFilename}`,
    `${basePath.serverBasePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
    `${basePath.serverBasePath}/ui/legacy_light_theme.css`,
  ];

  return (
    <html lang={i18n.getLocale()}>
      <head>
        <title>{title}</title>
        {styleSheetPaths.map((path) => (
          <link href={path} rel="stylesheet" key={path} />
        ))}
        <Fonts url={uiPublicURL} />
        {/* The alternate icon is a fallback for Safari which does not yet support SVG favicons */}
        <link rel="alternate icon" type="image/png" href={`${uiPublicURL}/favicons/favicon.png`} />
        <link rel="icon" type="image/svg+xml" href={`${uiPublicURL}/favicons/favicon.svg`} />
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
                  title={<h2>{title}</h2>}
                  body={<p>{title}</p>}
                  actions={[
                    <EuiButton color="primary" fill href={originalURL} data-test-subj="LogInButton">
                      <FormattedMessage
                        id="xpack.security.unauthorized.login"
                        defaultMessage="Log in"
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

export function renderUnauthorizedPage(props: Props) {
  return renderToStaticMarkup(<UnauthorizedPage {...props} />);
}

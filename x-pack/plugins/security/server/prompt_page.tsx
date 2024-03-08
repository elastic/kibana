/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'css.escape'; // Polyfill required to render `EuiPageTemplate` server-side
import { EuiPageTemplate, EuiProvider, euiStylisPrefixer } from '@elastic/eui';
// @ts-expect-error no definitions in component folder
import { icon as EuiIconWarning } from '@elastic/eui/lib/components/icon/assets/warning';
// @ts-expect-error no definitions in component folder
import { appendIconComponentCache } from '@elastic/eui/lib/components/icon/icon';
import createCache from '@emotion/cache';
import createEmotionServer from '@emotion/server/create-instance';
import type { ReactNode } from 'react';
import React from 'react';
import { renderToString } from 'react-dom/server';

import type { IBasePath } from '@kbn/core/server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { IStaticAssets } from '@kbn/core-http-server';
import { Fonts } from '@kbn/core-rendering-server-internal';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';

// Preload the warning icon used by `EuiEmptyPrompt` to ensure that it's loaded
// in advance the first time this page is rendered server-side. If not, the
// icon svg wouldn't contain any paths the first time the page was rendered.
appendIconComponentCache({
  warning: EuiIconWarning,
});

const emotionCache = createCache({ key: 'eui', stylisPlugins: [euiStylisPrefixer] });

interface Props {
  staticAssets: IStaticAssets;
  basePath: IBasePath;
  scriptPaths?: string[];
  title: ReactNode;
  body: ReactNode;
  actions: ReactNode;
  customBranding: CustomBranding;
}

export function PromptPage({
  basePath,
  staticAssets,
  scriptPaths = [],
  title,
  body,
  actions,
  customBranding,
}: Props) {
  const content = (
    <I18nProvider>
      <EuiProvider colorMode="light" cache={emotionCache}>
        <EuiPageTemplate data-test-subj="promptPage">
          <EuiPageTemplate.EmptyPrompt
            iconType="warning"
            iconColor="danger"
            title={<h2>{title}</h2>}
            body={body}
            actions={actions}
          />
        </EuiPageTemplate>
      </EuiProvider>
    </I18nProvider>
  );

  const { extractCriticalToChunks, constructStyleTagsFromChunks } =
    createEmotionServer(emotionCache);
  const chunks = extractCriticalToChunks(renderToString(content));
  const emotionStyles = constructStyleTagsFromChunks(chunks);

  const uiPublicURL = staticAssets.prependPublicUrl('/ui');
  const regularBundlePath = staticAssets.prependPublicUrl('/bundles');
  const styleSheetPaths = [
    `${regularBundlePath}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.cssDistFilename}`,
    `${regularBundlePath}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.lightCssDistFilename('v8')}`,
  ];

  return (
    <html lang={i18n.getLocale()}>
      <head>
        <title>{customBranding.pageTitle ? customBranding.pageTitle : 'Elastic'}</title>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: `</style>${emotionStyles}` }} />
        {styleSheetPaths.map((path) => (
          <link href={path} rel="stylesheet" key={path} />
        ))}
        <Fonts url={uiPublicURL} />
        {/* The alternate icon is a fallback for Safari which does not yet support SVG favicons */}
        {customBranding.faviconPNG ? (
          <link rel="alternate icon" type="image/png" href={customBranding.faviconPNG} />
        ) : (
          <link
            rel="alternate icon"
            type="image/png"
            href={`${uiPublicURL}/favicons/favicon.png`}
          />
        )}
        {customBranding.faviconSVG ? (
          <link rel="icon" type="image/svg+xml" href={customBranding.faviconSVG} />
        ) : (
          <link rel="icon" type="image/svg+xml" href={`${uiPublicURL}/favicons/favicon.svg`} />
        )}
        {scriptPaths.map((path) => (
          <script src={basePath.prepend(path)} key={path} />
        ))}
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>{content}</body>
    </html>
  );
}

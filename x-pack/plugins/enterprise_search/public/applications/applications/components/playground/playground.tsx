/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import type { PlaygroundPageMode } from '@kbn/search-playground/public';

import { KibanaLogic } from '../../../shared/kibana';

import { SearchPlaygroundPageTemplate } from './page_template';

interface PlaygroundProps {
  pageMode?: PageMode;
}

export enum PageMode {
  chat = 'chat',
  search = 'search',
}

export const Playground: React.FC<PlaygroundProps> = ({ pageMode = PageMode.chat }) => {
  const { searchPlayground } = useValues(KibanaLogic);

  if (!searchPlayground) {
    return null;
  }
  return (
    <searchPlayground.PlaygroundProvider>
      <SearchPlaygroundPageTemplate
        pageChrome={[
          i18n.translate('xpack.enterpriseSearch.content.playground.breadcrumb', {
            defaultMessage: 'Playground',
          }),
        ]}
        pageViewTelemetry="Playground"
        restrictWidth={false}
        panelled={false}
        customPageSections
        bottomBorder="extended"
      >
        <searchPlayground.Playground pageMode={pageMode as unknown as PlaygroundPageMode} />
      </SearchPlaygroundPageTemplate>
    </searchPlayground.PlaygroundProvider>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { KibanaLogic } from '../../shared/kibana';
import { SetSearchChrome } from '../../shared/kibana_chrome';

import { SearchHomepagePageTemplate } from './layout/page_template';

export const SearchHomepagePage = () => {
  const { isSearchHomepageEnabled, searchHomepage } = useValues(KibanaLogic);

  if (!isSearchHomepageEnabled || !searchHomepage) {
    return null;
  }

  return (
    <SearchHomepagePageTemplate
      restrictWidth={false}
      grow={false}
      offset={0}
      pageViewTelemetry="searchHomepage"
    >
      <SetSearchChrome />
      <searchHomepage.SearchHomepage />
    </SearchHomepagePageTemplate>
  );
};

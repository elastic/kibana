/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore No typings for EuiSearchBar
import { EuiSearchBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const searchBox = {
  placeholder: i18n.translate('xpack.uptime.filterBar.loadingMessage', {
    defaultMessage: 'Loading…',
  }),
};

/**
 * This component provides a visual placeholder while the FilterBar is loading.
 * The onChange prop is required, so we provide an empty function to suppress the warning.
 */
export const FilterBarLoading = () => (
  <EuiSearchBar
    box={searchBox}
    onChange={() => {
      /* */
    }}
  />
);

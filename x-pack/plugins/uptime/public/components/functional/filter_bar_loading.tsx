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

export const FilterBarLoading = () => <EuiSearchBar box={searchBox} />;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/common';
import { i18n } from '@kbn/i18n';
import { securitySolutionSpecProvider } from '.';
import { SecurityPageName } from '../../common/constants';
import { SAMPLE_DATA_VIEW_ID, SAVED_SEARCH_ID } from './constants';

const getDiscoverPathForSampleDataset = (objId: string) => getSavedSearchFullPathUrl(objId);
const getSecurityPathForSampleDataset = () =>
  `/app/security/${SecurityPageName.overview}?sourcerer=(default:(id:%27${SAMPLE_DATA_VIEW_ID}%27,selectedPatterns:!(%27kibana_sample_data_securitysolution_*%27)))`;

export const registerSampleData = (home: HomeServerPluginSetup) => {
  home.sampleData.registerSampleDataSet(securitySolutionSpecProvider);

  home.sampleData.addAppLinksToSampleDataset('securitysolution', [
    {
      sampleObject: {
        type: 'search',
        id: SAVED_SEARCH_ID,
      },
      getPath: getDiscoverPathForSampleDataset,
      label: i18n.translate('securitySolution.sampleData.discover.viewLinkLabel', {
        defaultMessage: 'Discover',
      }),
      icon: 'discoverApp',
      order: -1,
    },
  ]);

  home.sampleData.addAppLinksToSampleDataset('securitysolution', [
    {
      sampleObject: null,
      getPath: getSecurityPathForSampleDataset,
      label: i18n.translate('securitySolution.sampleData.securitySolution.viewLinkLabel', {
        defaultMessage: 'Security Solution',
      }),
      icon: 'securityApp',
    },
  ]);
};

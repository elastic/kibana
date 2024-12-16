/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart, ChromeStart } from '@kbn/core/public';
import { HttpSetup } from '@kbn/core/public';
import { Section } from '../../../common/constants';
import type { IndexDetailsTabId } from '../../../common/constants';
import { IndexDetailsSection } from '../../../common/constants';
import { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { firstValueFrom } from 'rxjs';
import { CloudSetup } from '@kbn/cloud-plugin/public';

export const getTemplateListLink = () => `/templates`;

export const getTemplateDetailsLink = (name: string, isLegacy?: boolean) => {
  let url = `/templates/${encodeURIComponent(name)}`;
  if (isLegacy) {
    url = `${url}?legacy=${isLegacy}`;
  }
  return encodeURI(url);
};

export const getTemplateEditLink = (name: string, isLegacy?: boolean) => {
  let url = `/edit_template/${encodeURIComponent(name)}`;
  if (isLegacy) {
    url = `${url}?legacy=true`;
  }
  return encodeURI(url);
};

export const getTemplateCloneLink = (name: string, isLegacy?: boolean) => {
  let url = `/clone_template/${encodeURIComponent(name)}`;
  if (isLegacy) {
    url = `${url}?legacy=true`;
  }
  return encodeURI(url);
};

export const getIndexListUri = (filter?: string, includeHiddenIndices?: boolean) => {
  let url = `/${Section.Indices}`;
  const hiddenIndicesParam =
    typeof includeHiddenIndices !== 'undefined' ? includeHiddenIndices : false;
  if (hiddenIndicesParam) {
    url = `${url}?includeHiddenIndices=${hiddenIndicesParam}`;
  }
  if (filter && filter !== 'undefined') {
    // React router tries to decode url params but it can't because the browser partially
    // decodes them. So we have to encode both the URL and the filter to get it all to
    // work correctly for filters with URL unsafe characters in them.
    url = `${url}${hiddenIndicesParam ? '&' : '?'}filter=${encodeURIComponent(filter)}`;
  }

  return url;
};

export const getDataStreamDetailsLink = (name: string) => {
  return encodeURI(`/data_streams/${encodeURIComponent(name)}`);
};

export const getIndexDetailsLink = (
  indexName: string,
  indicesListURLParams: string,
  tab?: IndexDetailsTabId
) => {
  let link = `/${Section.Indices}/index_details?indexName=${encodeURIComponent(indexName)}`;
  if (indicesListURLParams) {
    link = `${link}&${indicesListURLParams.replace('?', '')}`;
  }
  if (tab) {
    link = `${link}&tab=${tab}`;
  }
  return link;
};

export const getComponentTemplatesLink = (usedByTemplateName?: string) => {
  let url = '/component_templates';
  if (usedByTemplateName) {
    const filter = `usedBy=(${usedByTemplateName})`;
    url = `${url}?filter=${encodeURIComponent(filter)}`;
  }
  return url;
};

export const getComponentTemplateDetailLink = (name: string) => {
  return `/component_templates/${encodeURIComponent(name)}`;
};

export const navigateToIndexDetailsPage = async (
  indexName: string,
  indicesListURLParams: string,
  application: ApplicationStart,
  http: HttpSetup,
  share: SharePublicStart,
  chrome: ChromeStart,
  cloud: CloudSetup,
  tabId?: IndexDetailsSection
) => {
  const isServerlessEnabled = cloud.isServerlessEnabled;
  const serverlessActiveSolutionId = await firstValueFrom(
    chrome.getActiveSolutionNavId$()
  );
  const searchIndicesLocator = share.url.locators.get('SEARCH_INDEX_DETAILS_LOCATOR_ID');
  if(searchIndicesLocator && (!isServerlessEnabled  || serverlessActiveSolutionId === 'es')) {
    searchIndicesLocator.navigate({indexName, 'detailsTabId': tabId})
  }else{
    application.navigateToUrl(
      http.basePath.prepend(
        `/app/management/data/index_management${getIndexDetailsLink(
          indexName,
          indicesListURLParams,
          tabId
        )}`
      )
    );
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudDefendPages } from './constants';
import type { CloudDefendPageId, CloudDefendPage } from './types';

interface CloudDefendLinkItem<TId extends string = CloudDefendPageId> {
  id: TId;
  title: string;
  path: string;
}

interface CloudDefendNavTab<TId extends string = CloudDefendPageId> {
  id: TId;
  name: string;
  href: string;
  disabled: boolean;
}

/**
 * Gets the cloud_defend link properties of a Cloud Defend page for navigation in the security solution.
 * @param cloudDefendPage the name of the cloud defend page.
 */
export const getSecuritySolutionLink = <TId extends string = CloudDefendPageId>(
  cloudDefendPage: CloudDefendPage
): CloudDefendLinkItem<TId> => {
  return {
    id: cloudDefendPages[cloudDefendPage].id as TId,
    title: cloudDefendPages[cloudDefendPage].name,
    path: cloudDefendPages[cloudDefendPage].path,
  };
};

/**
 * Gets the link properties of a Cloud Defend page for navigation in the old security solution navigation.
 * @param cloudDefendPage the name of the cloud defend page.
 * @param basePath the base path for links.
 */
export const getSecuritySolutionNavTab = <TId extends string = CloudDefendPageId>(
  cloudDefendPage: CloudDefendPage,
  basePath: string
): CloudDefendNavTab<TId> => ({
  id: cloudDefendPages[cloudDefendPage].id as TId,
  name: cloudDefendPages[cloudDefendPage].name,
  href: `${basePath}${cloudDefendPages[cloudDefendPage].path}`,
  disabled: !!cloudDefendPages[cloudDefendPage].disabled,
});

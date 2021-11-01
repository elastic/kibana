/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues } from 'kea';

import { KibanaLogic } from '../kibana';

import {
  useGenerateBreadcrumbs,
  useEnterpriseSearchBreadcrumbs,
  useAppSearchBreadcrumbs,
  useWorkplaceSearchBreadcrumbs,
  BreadcrumbTrail,
} from './generate_breadcrumbs';
import { enterpriseSearchTitle, appSearchTitle, workplaceSearchTitle } from './generate_title';

/**
 * Helpers for setting Kibana chrome (breadcrumbs, doc titles) on React view mount
 * @see https://github.com/elastic/kibana/blob/main/src/core/public/chrome/chrome_service.tsx
 *
 * Example usage (don't forget to i18n.translate() page titles!):
 *
 * <SetAppSearchPageChrome trail={['Engines', 'Example Engine Name, 'Curations']} />
 * Breadcrumb output: Enterprise Search > App Search > Engines > Example Engine Name > Curations
 * Title output: Curations - Example Engine Name - Engines - App Search - Elastic
 *
 * <SetWorkplaceSearchChrome />
 * Breadcrumb output: Enterprise Search > Workplace Search
 * Title output: Workplace Search - Elastic
 */

interface SetChromeProps {
  trail?: BreadcrumbTrail;
}

export const SetEnterpriseSearchChrome: React.FC<SetChromeProps> = ({ trail = [] }) => {
  const { setBreadcrumbs, setDocTitle } = useValues(KibanaLogic);

  const title = reverseArray(trail);
  const docTitle = enterpriseSearchTitle(title);

  const crumbs = useGenerateBreadcrumbs(trail);
  const breadcrumbs = useEnterpriseSearchBreadcrumbs(crumbs);

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    setDocTitle(docTitle);
  }, [trail]);

  return null;
};

export const SetAppSearchChrome: React.FC<SetChromeProps> = ({ trail = [] }) => {
  const { setBreadcrumbs, setDocTitle } = useValues(KibanaLogic);

  const title = reverseArray(trail);
  const docTitle = appSearchTitle(title);

  const crumbs = useGenerateBreadcrumbs(trail);
  const breadcrumbs = useAppSearchBreadcrumbs(crumbs);

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    setDocTitle(docTitle);
  }, [trail]);

  return null;
};

export const SetWorkplaceSearchChrome: React.FC<SetChromeProps> = ({ trail = [] }) => {
  const { setBreadcrumbs, setDocTitle } = useValues(KibanaLogic);

  const title = reverseArray(trail);
  const docTitle = workplaceSearchTitle(title);

  const crumbs = useGenerateBreadcrumbs(trail);
  const breadcrumbs = useWorkplaceSearchBreadcrumbs(crumbs);

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    setDocTitle(docTitle);
  }, [trail]);

  return null;
};

// Small util - performantly reverses an array without mutating the original array
const reverseArray = (array: string[]) => array.slice().reverse();

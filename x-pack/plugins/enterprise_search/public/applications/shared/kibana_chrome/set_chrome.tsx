/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiBreadcrumb } from '@elastic/eui';

import { KibanaContext, IKibanaContext } from '../../index';
import {
  useAppSearchBreadcrumbs,
  useWorkplaceSearchBreadcrumbs,
  TBreadcrumbs,
} from './generate_breadcrumbs';
import { appSearchTitle, workplaceSearchTitle, TTitle } from './generate_title';

/**
 * Helpers for setting Kibana chrome (breadcrumbs, doc titles) on React view mount
 * @see https://github.com/elastic/kibana/blob/master/src/core/public/chrome/chrome_service.tsx
 */

export type TSetBreadcrumbs = (breadcrumbs: EuiBreadcrumb[]) => void;

interface IBreadcrumbsProps {
  text: string;
  isRoot?: never;
}
interface IRootBreadcrumbsProps {
  isRoot: true;
  text?: never;
}
type TBreadcrumbsProps = IBreadcrumbsProps | IRootBreadcrumbsProps;

export const SetAppSearchChrome: React.FC<TBreadcrumbsProps> = ({ text, isRoot }) => {
  const history = useHistory();
  const { setBreadcrumbs, setDocTitle } = useContext(KibanaContext) as IKibanaContext;

  const title = isRoot ? [] : [text];
  const docTitle = appSearchTitle(title as TTitle | []);

  const crumb = isRoot ? [] : [{ text, path: history.location.pathname }];
  const breadcrumbs = useAppSearchBreadcrumbs(crumb as TBreadcrumbs | []);

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    setDocTitle(docTitle);
  }, []);

  return null;
};

export const SetWorkplaceSearchChrome: React.FC<TBreadcrumbsProps> = ({ text, isRoot }) => {
  const history = useHistory();
  const { setBreadcrumbs, setDocTitle } = useContext(KibanaContext) as IKibanaContext;

  const title = isRoot ? [] : [text];
  const docTitle = workplaceSearchTitle(title as TTitle | []);

  const crumb = isRoot ? [] : [{ text, path: history.location.pathname }];
  const breadcrumbs = useWorkplaceSearchBreadcrumbs(crumb as TBreadcrumbs | []);

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    setDocTitle(docTitle);
  }, []);

  return null;
};

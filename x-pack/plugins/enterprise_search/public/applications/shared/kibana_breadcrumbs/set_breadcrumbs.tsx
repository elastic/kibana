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
  appSearchBreadcrumbs,
  workplaceSearchBreadcrumbs,
  TBreadcrumbs,
} from './generate_breadcrumbs';

/**
 * Small on-mount helper for setting Kibana's chrome breadcrumbs on any App Search view
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

export const SetAppSearchBreadcrumbs: React.FC<TBreadcrumbsProps> = ({ text, isRoot }) => {
  const history = useHistory();
  const { setBreadcrumbs } = useContext(KibanaContext) as IKibanaContext;

  const crumb = isRoot ? [] : [{ text, path: history.location.pathname }];

  useEffect(() => {
    setBreadcrumbs(appSearchBreadcrumbs(history)(crumb as TBreadcrumbs | []));
  }, []);

  return null;
};

export const SetWorkplaceSearchBreadcrumbs: React.FC<TBreadcrumbsProps> = ({ text, isRoot }) => {
  const history = useHistory();
  const { setBreadcrumbs } = useContext(KibanaContext) as IKibanaContext;

  const crumb = isRoot ? [] : [{ text, path: history.location.pathname }];

  useEffect(() => {
    setBreadcrumbs(workplaceSearchBreadcrumbs(history)(crumb as TBreadcrumbs | []));
  }, []);

  return null;
};

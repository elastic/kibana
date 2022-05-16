/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import { ChromeBreadcrumb } from '@kbn/core/public';

import * as i18n from '../../translations';
import { GetUrlForApp } from '../../../common/components/navigation/types';
import { APP_UI_ID } from '../../../../common/constants';
import { SecurityPageName } from '../../../app/types';

export const getBreadcrumbs = (
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => {
  const breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getUrlForApp(APP_UI_ID, {
        path: !isEmpty(search[0]) ? search[0] : '',
        deepLinkId: SecurityPageName.kubernetes,
      }),
    },
  ];

  return breadcrumb;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { WORKCHAT_APP_ID } from '../../../common/features';
import { useKibana } from './use_kibana';

export const useBreadcrumb = (breadcrumbs: ChromeBreadcrumb[]) => {
  const {
    services: { chrome, application },
  } = useKibana();

  const appUrl = useMemo(() => {
    return application.getUrlForApp(WORKCHAT_APP_ID);
  }, [application]);

  const baseCrumbs: ChromeBreadcrumb[] = useMemo(() => {
    return [
      {
        text: i18n.translate('workchatApp.breadcrumb.workchat', { defaultMessage: 'WorkChat' }),
        href: appUrl,
      },
    ];
  }, [appUrl]);

  useEffect(() => {
    chrome.setBreadcrumbs([...baseCrumbs, ...breadcrumbs], {
      project: { value: breadcrumbs.length ? breadcrumbs : baseCrumbs, absolute: true },
    });
    return () => {
      chrome.setBreadcrumbs([]);
    };
  }, [chrome, baseCrumbs, breadcrumbs]);
};

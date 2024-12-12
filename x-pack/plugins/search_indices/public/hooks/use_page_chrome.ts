/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { useKibana } from './use_kibana';

export const usePageChrome = (docTitle: string, breadcrumbs: ChromeBreadcrumb[]) => {
  const { chrome, http, serverless } = useKibana().services;

  useEffect(() => {
    chrome.docTitle.change(docTitle);
    const newBreadcrumbs = breadcrumbs.map((breadcrumb) => {
      if (breadcrumb.href && http.basePath.get().length > 0) {
        breadcrumb.href = http.basePath.prepend(breadcrumb.href);
      }
      return breadcrumb;
    });
    if (serverless) {
      serverless.setBreadcrumbs(newBreadcrumbs);
    } else {
      chrome.setBreadcrumbs(newBreadcrumbs);
    }
    return () => {
      // clear manually set breadcrumbs
      if (serverless) {
        serverless.setBreadcrumbs([]);
      } else {
        chrome.setBreadcrumbs([]);
      }
    };
  }, [breadcrumbs, chrome, docTitle, http.basePath, serverless]);
};

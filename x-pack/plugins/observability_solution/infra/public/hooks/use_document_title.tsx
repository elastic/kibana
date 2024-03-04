/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { useEffect } from 'react';
import { observabilityTitle } from '../translations';
import { useKibanaContextForPlugin } from './use_kibana';

export const useDocumentTitle = (extraTitles: ChromeBreadcrumb[]) => {
  const {
    services: { chrome },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    const docTitle = [{ text: observabilityTitle }, ...extraTitles]
      .reverse()
      .map((breadcrumb) => breadcrumb.text as string);

    chrome.docTitle.change(docTitle);
  }, [chrome, extraTitles]);
};

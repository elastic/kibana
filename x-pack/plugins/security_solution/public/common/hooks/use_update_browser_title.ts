/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useNavLinks } from '../links/nav_links';
import { useFindAppLinksByPath } from '../links/use_find_app_links_by_path';

export const useUpdateBrowserTitle = () => {
  const navLinks = useNavLinks();
  const linkInfo = useFindAppLinksByPath(navLinks);

  useEffect(() => {
    document.title = `${linkInfo?.title ?? ''} - Kibana`;
  }, [linkInfo]);
};

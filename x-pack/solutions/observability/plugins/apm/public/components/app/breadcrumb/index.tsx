/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';

export const Breadcrumb = ({
  title,
  href,
  omitOnServerless = false,
  children,
  parentTitle,
  parentHref,
}: {
  title: string;
  href: string;
  omitOnServerless?: boolean;
  children: React.ReactElement;
  parentTitle?: string;
  parentHref?: string;
}) => {
  const { core } = useApmPluginContext();

  useBreadcrumb(
    () =>
      parentTitle && parentHref
        ? [
            { title: parentTitle, href: core.http.basePath.prepend('/app/apm' + parentHref) },
            { title, href: core.http.basePath.prepend('/app/apm' + href) },
          ]
        : { title, href: core.http.basePath.prepend('/app/apm' + href) },
    [core.http.basePath, href, parentHref, parentTitle, title],
    {
      omitOnServerless,
    }
  );

  return children;
};

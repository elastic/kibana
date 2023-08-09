/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { IBasePath } from '@kbn/core/public';
import React from 'react';
import url from 'url';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  children: React.ReactNode;
}

export const getCreateDashboardHref = ({
  basePath,
}: {
  basePath: IBasePath;
}) => {
  const dashboardPath = url.format({
    pathname: basePath.prepend('/app/dashboards'),
  });
  return `${dashboardPath}#/create`;
};

export function CreateDashboardLink({ ...rest }: Props) {
  const { core } = useApmPluginContext();

  const href = getCreateDashboardHref({
    basePath: core.http.basePath,
  });

  return (
    <EuiLink data-test-subj="apmKibanaDashboardLink" {...rest} href={href} />
  );
}

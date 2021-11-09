/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import type { IBasePath } from 'kibana/public';
import React from 'react';
import url from 'url';
import type { InfraAppId } from '../../../../../infra/public';
import { useKibanaServicesContext } from '../../../context/kibana_services/use_kibana_services_context';
import { fromQuery } from './url_helpers';

interface InfraQueryParams {
  time?: number;
  from?: number;
  to?: number;
  filter?: string;
}

interface Props extends EuiLinkAnchorProps {
  app: InfraAppId;
  path?: string;
  query: InfraQueryParams;
  children?: React.ReactNode;
}

export const getInfraHref = ({
  app,
  basePath,
  query,
  path,
}: {
  app: InfraAppId;
  basePath: IBasePath;
  query: InfraQueryParams;
  path?: string;
}) => {
  const nextSearch = fromQuery(query);
  return url.format({
    pathname: basePath.prepend(`/app/${app}${path || ''}`),
    search: nextSearch,
  });
};

export function InfraLink({ app, path, query = {}, ...rest }: Props) {
  const { http } = useKibanaServicesContext();
  const href = getInfraHref({
    app,
    basePath: http.basePath,
    query,
    path,
  });
  return <EuiLink {...rest} href={href} />;
}

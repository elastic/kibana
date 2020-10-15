/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { IBasePath } from 'kibana/public';
import React from 'react';
import url from 'url';
import { InfraAppId } from '../../../../../infra/public';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
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
  const { core } = useApmPluginContext();
  const href = getInfraHref({ app, basePath: core.http.basePath, query, path });
  return <EuiLink {...rest} href={href} />;
}

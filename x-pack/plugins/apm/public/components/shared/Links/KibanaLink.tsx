/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import React from 'react';
import url from 'url';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

interface Props extends EuiLinkAnchorProps {
  path?: string;
  children?: React.ReactNode;
}

export function KibanaLink({ path, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const href = url.format({
    pathname: core.http.basePath.prepend('/app/kibana'),
    hash: path
  });
  return <EuiLink {...rest} href={href} />;
}

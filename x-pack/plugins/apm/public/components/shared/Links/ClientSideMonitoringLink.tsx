/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import React from 'react';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

export function ClientSideMonitoringLink(props: EuiLinkAnchorProps) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const href = basePath.prepend(`/app/csm`);

  return <EuiLink {...props} href={href} />;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

// union type constisting of valid guide sections that we link to
type DocsSection =
  | '/apm/get-started'
  | '/x-pack'
  | '/apm/server'
  | '/kibana'
  | '/elasticsearch/reference'
  | '/cloud';

interface Props extends EuiLinkAnchorProps {
  section: DocsSection;
  path: string;
}

export function ElasticDocsLink({ section, path, children, ...rest }: Props) {
  const { docLinks } = useApmPluginContext().core;
  const baseUrl = docLinks.ELASTIC_WEBSITE_URL;
  const version = section === '/cloud' ? 'current' : docLinks.DOC_LINK_VERSION;
  const href = `${baseUrl}guide/en${section}/${version}${path}`;

  return typeof children === 'function' ? (
    children(href)
  ) : (
    <EuiLink href={href} {...rest}>
      {children}
    </EuiLink>
  );
}

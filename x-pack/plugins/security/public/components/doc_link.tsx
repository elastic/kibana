/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, FunctionComponent } from 'react';
import { EuiLink } from '@elastic/eui';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../src/core/public';

export type DocLinks = CoreStart['docLinks']['links'];
export type GetDocLinkFunction = (app: string, doc: string) => string;

/**
 * Creates links to the documentation.
 *
 * @see {@link DocLink} for a component that creates a link to the docs.
 *
 * @example
 * ```typescript
 * <DocLink app="elasticsearch" doc="built-in-roles.html">
 *   Learn what privileges individual roles grant.
 * </DocLink>
 * ```
 *
 * @example
 * ```typescript
 * const [docs] = useDocLinks();
 *
 * <EuiLink href={docs.dashboard.guide} target="_blank" external>
 *   Learn how to get started with dashboards.
 * </EuiLink>
 * ```
 */
export function useDocLinks(): [DocLinks, GetDocLinkFunction] {
  const { services } = useKibana();
  const { links, ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = services.docLinks!;
  const getDocLink = useCallback<GetDocLinkFunction>(
    (app, doc) => {
      return `${ELASTIC_WEBSITE_URL}guide/en/${app}/reference/${DOC_LINK_VERSION}/${doc}`;
    },
    [ELASTIC_WEBSITE_URL, DOC_LINK_VERSION]
  );
  return [links, getDocLink];
}

export interface DocLinkProps {
  app: string;
  doc: string;
}

export const DocLink: FunctionComponent<DocLinkProps> = ({ app, doc, children }) => {
  const [, getDocLink] = useDocLinks();
  return (
    <EuiLink href={getDocLink(app, doc)} target="_blank" external>
      {children}
    </EuiLink>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';
import { useKibana } from '../../lib/kibana';
import { ExternalLink } from './external_link';
import { COMMON_ARIA_LABEL_ENDING } from './links_translations';

interface DocLinkProps {
  guidePath?: string;
  docPath: string;
  linkText: string;
}

const DocLink: FC<DocLinkProps> = ({ guidePath = 'security', docPath, linkText }) => {
  const { services } = useKibana();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = services.docLinks;

  const url = `${ELASTIC_WEBSITE_URL}guide/en/${guidePath}/${DOC_LINK_VERSION}/${docPath}`;
  const ariaLabel = `${linkText} - ${COMMON_ARIA_LABEL_ENDING}`;

  return <ExternalLink url={url} text={linkText} ariaLabel={ariaLabel} />;
};

/**
 * A simple text link to documentation.
 */
const DocLinkWrapper = memo(DocLink);

export { DocLinkWrapper as DocLink };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiLink } from '@elastic/eui';

interface ExternalLinkProps {
  url: string;
  text: string;
}

/**
 * A simplistic text link for opening external urls in a new browser tab.
 */
export const ExternalLink: FC<ExternalLinkProps> = ({ url, text }) => {
  return (
    <EuiLink href={url} external target="_blank" rel="noopener">
      {text}
    </EuiLink>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

export const SynonymIcon: React.FC = ({ ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 18 18"
    width="18"
    height="18"
    className="euiIcon euiIcon--subdued euiIcon--medium"
    {...props}
    aria-label={i18n.translate('xpack.enterpriseSearch.appSearch.engine.synonyms.iconAriaLabel', {
      defaultMessage: 'synonym for',
    })}
  >
    <path d="M5.477 4.69c-1.1-.043-2.176.7-3.365 2.596a.65.65 0 01-1.101-.69c1.413-2.255 2.883-3.27 4.518-3.204 1.214.048 2.125.522 3.977 1.812l.075.052c3.175 2.212 4.387 2.352 6.33-.339a.65.65 0 111.054.761c-2.48 3.436-4.447 3.209-8.128.645l-.074-.052c-1.64-1.142-2.415-1.546-3.286-1.58zm0 6.35c-1.1-.043-2.176.7-3.365 2.596a.65.65 0 01-1.101-.69c1.413-2.255 2.883-3.27 4.518-3.204 1.214.048 2.125.522 3.977 1.812l.075.052c3.175 2.212 4.387 2.352 6.33-.338a.65.65 0 111.054.76c-2.48 3.436-4.447 3.209-8.128.645l-.074-.052c-1.64-1.142-2.415-1.546-3.286-1.58z" />
  </svg>
);

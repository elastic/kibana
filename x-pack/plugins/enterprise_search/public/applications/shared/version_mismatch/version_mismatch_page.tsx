/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';

import { VersionMismatchError } from './version_mismatch_error';

interface Props {
  enterpriseSearchVersion?: string;
  kibanaVersion?: string;
}

export const VersionMismatchPage: React.FC<Props> = (props) => (
  <KibanaPageTemplate isEmptyState>
    <VersionMismatchError {...props} />
  </KibanaPageTemplate>
);

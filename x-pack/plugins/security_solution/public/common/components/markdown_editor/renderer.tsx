/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiMarkdownFormat } from '@elastic/eui';

import { parsingPlugins, processingPlugins } from './plugins';

interface Props {
  children: string;
}

const MarkdownRendererComponent: React.FC<Props> = ({ children }) => {
  return (
    <EuiMarkdownFormat parsingPluginList={parsingPlugins} processingPluginList={processingPlugins}>
      {children}
    </EuiMarkdownFormat>
  );
};

export const MarkdownRenderer = memo(MarkdownRendererComponent);

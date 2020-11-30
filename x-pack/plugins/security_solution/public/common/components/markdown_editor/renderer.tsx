/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { cloneDeep } from 'lodash/fp';
import { EuiMarkdownFormat, EuiLinkAnchorProps } from '@elastic/eui';

import { parsingPlugins, processingPlugins } from './plugins';
import { MarkdownLink } from './markdown_link';

interface Props {
  children: string;
  disableLinks?: boolean;
}

const MarkdownRendererComponent: React.FC<Props> = ({ children, disableLinks }) => {
  const MarkdownLinkProcessingComponent: React.FC<EuiLinkAnchorProps> = useMemo(
    () => (props) => <MarkdownLink {...props} disableLinks={disableLinks} />,
    [disableLinks]
  );

  // Deep clone of the processing plugins to prevent affecting the markdown editor.
  const processingPluginList = cloneDeep(processingPlugins);
  // This line of code is TS-compatible and it will break if [1][1] change in the future.
  processingPluginList[1][1].components.a = MarkdownLinkProcessingComponent;

  return (
    <EuiMarkdownFormat
      parsingPluginList={parsingPlugins}
      processingPluginList={processingPluginList}
    >
      {children}
    </EuiMarkdownFormat>
  );
};

export const MarkdownRenderer = memo(MarkdownRendererComponent);

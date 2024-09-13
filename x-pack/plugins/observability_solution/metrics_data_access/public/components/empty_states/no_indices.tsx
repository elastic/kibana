/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { EuiEmptyPromptProps } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

interface NoIndicesProps extends Omit<EuiEmptyPromptProps, 'body' | 'title'> {
  body: string;
  title: string;
}

// Represents a fully constructed page, including page template.
export const NoIndices: React.FC<NoIndicesProps> = ({ body, title, ...rest }) => {
  return (
    <KibanaPageTemplate.EmptyPrompt
      title={<h2>{title}</h2>}
      body={<PreLineText>{body}</PreLineText>}
      {...rest}
    />
  );
};

const PreLineText = styled.p`
  white-space: pre-line;
`;

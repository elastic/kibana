/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import styled from 'styled-components';
import { EuiMarkdownFormat } from '@elastic/eui';
import type { IExternalReferenceMetaDataProps } from './lazy_external_reference_content';

export const ContentWrapper = styled.div`
  padding: ${({ theme }) => `${theme.eui.euiSizeM} ${theme.eui.euiSizeL}`};
  text-overflow: ellipsis;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
`;

const AttachmentContent = (props: IExternalReferenceMetaDataProps) => {
  const {
    externalReferenceMetadata: { comment },
  } = props;

  return comment.trim().length > 0 ? (
    <ContentWrapper>
      <EuiMarkdownFormat grow={true}>{comment}</EuiMarkdownFormat>
    </ContentWrapper>
  ) : null;
};

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiMarkdownFormat } from '@elastic/eui';
import styled from 'styled-components';
import type { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { CASE_ATTACHMENT_ENDPOINT_TYPE_ID } from '../../../common/constants';
import { getLazyExternalContent } from './lazy_external_reference_content';
import type { IExternalReferenceMetaDataProps } from './lazy_external_reference_content';

const ContentWrapper = styled.div`
  padding: ${({ theme }) => `${theme.eui.euiSizeM} ${theme.eui.euiSizeL}`};
  text-overflow: ellipsis;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
`;

export const getExternalReferenceAttachmentEndpointRegular =
  (): ExternalReferenceAttachmentType => ({
    id: CASE_ATTACHMENT_ENDPOINT_TYPE_ID,
    displayName: 'Endpoint',
    // icon: 'empty',
    getAttachmentViewObject: (props) => {
      const iconType = props.externalReferenceMetadata.command === 'isolate' ? 'lock' : 'lockOpen';
      return {
        type: 'regular',
        event: getLazyExternalContent(props),
        timelineAvatar: <EuiAvatar name="endpoint" color="subdued" iconType={iconType} />,
        children: ({ externalReferenceMetadata }: IExternalReferenceMetaDataProps) => {
          return externalReferenceMetadata.comment.trim().length > 0 ? (
            <ContentWrapper>
              <EuiMarkdownFormat grow={true}>{externalReferenceMetadata.comment}</EuiMarkdownFormat>
            </ContentWrapper>
          ) : null;
        },
      };
    },
  });

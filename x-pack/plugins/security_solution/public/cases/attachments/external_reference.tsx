/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import type { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { ExternalReferenceAttachmentViewProps } from '@kbn/cases-plugin/target/types/public/client/attachment_framework/types';
import { CASE_ATTACHMENT_ENDPOINT_TYPE_ID } from '../../../common/constants';
import { getLazyExternalEventContent } from './lazy_external_reference_content';
import { getLazyExternalChildrenContent } from './lazy_external_reference_children_content';
import type { IExternalReferenceMetaDataProps } from './types';

export const getExternalReferenceAttachmentEndpointRegular =
  (): ExternalReferenceAttachmentType => ({
    id: CASE_ATTACHMENT_ENDPOINT_TYPE_ID,
    displayName: 'Endpoint',
    icon: 'empty',
    // @ts-expect-error: figure out types
    getAttachmentViewObject: (props: ExternalReferenceAttachmentViewProps) => {
      const iconType = props.externalReferenceMetadata?.command === 'isolate' ? 'lock' : 'lockOpen';
      return {
        type: 'regular',
        event: getLazyExternalEventContent(props as unknown as IExternalReferenceMetaDataProps),
        timelineAvatar: <EuiAvatar name="endpoint" color="subdued" iconType={iconType} />,
        children: getLazyExternalChildrenContent,
      };
    },
  });

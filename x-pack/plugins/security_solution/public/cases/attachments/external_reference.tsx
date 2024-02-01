/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import type { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { getLazyExternalChildrenContent } from './lazy_external_reference_children_content';
import { CASE_ATTACHMENT_ENDPOINT_TYPE_ID } from '../../../common/constants';
import { getLazyExternalEventContent } from './lazy_external_reference_content';
import type { IExternalReferenceMetaDataProps } from './types';

export const getExternalReferenceAttachmentEndpointRegular =
  (): ExternalReferenceAttachmentType => ({
    id: CASE_ATTACHMENT_ENDPOINT_TYPE_ID,
    displayName: 'Endpoint',
    // @ts-expect-error: TS2322 figure out types for children lazyExotic
    getAttachmentViewObject: (props: IExternalReferenceMetaDataProps) => {
      const iconType = props.externalReferenceMetadata?.command === 'isolate' ? 'lock' : 'lockOpen';
      return {
        type: 'regular',
        event: getLazyExternalEventContent(props),
        timelineAvatar: (
          <EuiAvatar name="endpoint" color="subdued" iconType={iconType} aria-label={iconType} />
        ),
        children: getLazyExternalChildrenContent,
      };
    },
  });

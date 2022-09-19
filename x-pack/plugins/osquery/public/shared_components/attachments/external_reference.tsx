/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar } from '@elastic/eui';
import React from 'react';
import type { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { getLazyExternalContent } from './lazy_external_reference_content';
import type { ServicesWrapperProps } from '../services_wrapper';
import OsqueryLogo from '../../components/osquery_icon/osquery.svg';

export const getExternalReferenceAttachmentRegular = (
  services: ServicesWrapperProps['services']
): ExternalReferenceAttachmentType => ({
  id: 'osquery',
  displayName: 'Osquery',
  getAttachmentViewObject: () => ({
    type: 'regular',
    event: 'attached Osquery results',
    timelineAvatar: <EuiAvatar name="osquery" color="subdued" iconType={OsqueryLogo} />,
    // @ts-expect-error update types
    children: getLazyExternalContent(services),
  }),
});

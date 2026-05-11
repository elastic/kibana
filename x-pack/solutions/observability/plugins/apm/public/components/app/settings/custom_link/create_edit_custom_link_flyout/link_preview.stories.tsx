/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { mockCreateCallApmApiV2 } from '@kbn/apm-api-shared';
import { createCallApmApi } from '../../../../../services/rest/create_call_apm_api';
import { LinkPreview } from './link_preview';
import { setApmInternalServices } from '../../../../../plugin';

export default {
  title: 'app/settings/CustomizeUI/CustomLink/CreateEditCustomLinkFlyout/LinkPreview',
  component: LinkPreview,
};

export function Example({ filters, label, url }: ComponentProps<typeof LinkPreview>) {
  const coreMock = {
    http: {
      get: async () => ({ transaction: { id: '0' } }),
    },
    uiSettings: { get: () => false },
  } as unknown as CoreStart;

  createCallApmApi(coreMock);
  const callApmApi = mockCreateCallApmApiV2(coreMock);
  setApmInternalServices({ callApmApi });

  return <LinkPreview filters={filters} label={label} url={url} />;
}
Example.args = {
  filters: [],
  label: 'Example label',
  url: 'https://example.com',
} as ComponentProps<typeof LinkPreview>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { CoreStart } from '@kbn/core/public';
import { createCallApmApi } from '../../../../../services/rest/create_call_apm_api';
import { LinkPreview } from './link_preview';

export default {
  title:
    'app/settings/CustomizeUI/CustomLink/CreateEditCustomLinkFlyout/LinkPreview',
  component: LinkPreview,
};

export function Example({
  filters,
  label,
  url,
}: ComponentProps<typeof LinkPreview>) {
  const coreMock = {
    http: {
      get: async () => ({ transaction: { id: '0' } }),
    },
    uiSettings: { get: () => false },
  } as unknown as CoreStart;

  createCallApmApi(coreMock);

  return <LinkPreview filters={filters} label={label} url={url} />;
}
Example.args = {
  filters: [],
  label: 'Example label',
  url: 'https://example.com',
} as ComponentProps<typeof LinkPreview>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n/react';
import { MockUrlService } from '../../../../../../../src/plugins/share/public/mocks';

export function LocaleWrapper({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

export const mockUrls = new MockUrlService();

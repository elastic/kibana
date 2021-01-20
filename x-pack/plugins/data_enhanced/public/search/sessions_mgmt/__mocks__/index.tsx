/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { UrlGeneratorsStart } from '../../../../../../../src/plugins/share/public/url_generators';

export function LocaleWrapper({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

export const mockUrls = ({
  getUrlGenerator: (id: string) => ({ createUrl: () => `hello-cool-${id}-url` }),
} as unknown) as UrlGeneratorsStart;

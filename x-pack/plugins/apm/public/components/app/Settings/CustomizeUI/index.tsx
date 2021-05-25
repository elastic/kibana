/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CustomLinkOverview } from './CustomLink';

export function CustomizeUI() {
  return (
    <>
      <EuiTitle size="l">
        <h1>
          {i18n.translate('xpack.apm.settings.customizeApp.title', {
            defaultMessage: 'Customize app',
          })}
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.settings.customizeApp.description', {
          defaultMessage: `Extend the APM app experience with the following settings.`,
        })}
      </EuiText>
      <EuiSpacer size="l" />
      <CustomLinkOverview />
    </>
  );
}

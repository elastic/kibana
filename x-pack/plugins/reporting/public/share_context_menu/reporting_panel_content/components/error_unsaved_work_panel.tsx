/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiIconTip } from '@elastic/eui';

const i18nTexts = {
  title: i18n.translate('xpack.reporting.panelContent.unsavedStateErrorTitle', {
    defaultMessage: 'Save your work before copying this URL.',
  }),
};

export const ErrorUnsavedWorkPanel: FunctionComponent = () => {
  return (
    <EuiIconTip
      size="m"
      content={i18nTexts.title}
      type="warning"
      color="warning"
      data-test-subj="shareReportingUnsavedState"
    />
  );
};

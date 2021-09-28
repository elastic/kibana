/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FunctionComponent } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText, EuiSpacer } from '@elastic/eui';

export const WarningUnsavedWorkPanel: FunctionComponent = ({ children }) => {
  return (
    <EuiCallOut size="s" title="Unsaved work" iconType="alert" color="warning">
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.reporting.panelContent.unsavedStateWarningText"
            defaultMessage="It is recommended to save your work before copying this URL."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {children}
    </EuiCallOut>
  );
};

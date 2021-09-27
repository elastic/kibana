/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState } from 'react';
import type { FunctionComponent } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText, EuiSpacer, EuiLink } from '@elastic/eui';

export const WarningUnsavedWorkPanel: FunctionComponent = ({ children }) => {
  const [proceedAnyway, setProceedAnyway] = useState(false);
  return (
    <EuiCallOut size="s" iconType="alert" color="warning">
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.reporting.panelContent.unsavedStateWarningText"
            defaultMessage="It is recommended to save your work before copying this URL."
          />{' '}
          <EuiLink
            onClick={() => setProceedAnyway(true)}
            color={proceedAnyway ? 'subdued' : 'warning'}
          >
            <FormattedMessage
              id="xpack.reporting.panelContent.checkbox.showCopyURLAnywayButtonLabel"
              defaultMessage="Proceed anyway."
            />
          </EuiLink>
        </p>
      </EuiText>
      {proceedAnyway && (
        <>
          <EuiSpacer size="s" />
          {children}
        </>
      )}
    </EuiCallOut>
  );
};

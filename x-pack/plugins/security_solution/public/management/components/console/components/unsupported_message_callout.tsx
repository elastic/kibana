/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiText, EuiTextColor, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const UNSUPPORTED_LABEL = i18n.translate(
  'xpack.securitySolution.console.unsupportedMessageCallout.title',
  { defaultMessage: 'Unsupported' }
);

export interface UnsupportedMessageCalloutProps {
  children: ReactNode;
  header?: ReactNode;
  'data-test-subj'?: string;
}

export const UnsupportedMessageCallout = memo<UnsupportedMessageCalloutProps>(
  ({ children, header = UNSUPPORTED_LABEL, 'data-test-subj': dataTestSubj }) => {
    return (
      <div data-test-subj={dataTestSubj}>
        <EuiText size="s">
          <EuiTextColor color="danger">{header}</EuiTextColor>
        </EuiText>
        <EuiSpacer size="s" />
        {children}
      </div>
    );
  }
);
UnsupportedMessageCallout.displayName = 'UnsupportedMessageCallout';

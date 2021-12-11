/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiCallOut, EuiText, EuiSpacer } from '@elastic/eui';

export const CalloutGroup: React.FC<{ items: string[]; isError?: boolean }> = ({
  items,
  isError,
}) =>
  items.length > 0 ? (
    <>
      {items.map((item, i) => (
        <Fragment key={`${item}-${i}`}>
          <EuiSpacer size="s" />
          <EuiCallOut
            color={isError ? 'danger' : 'warning'}
            iconType="help"
            data-test-subj={isError ? 'preview-error' : 'preview-warning'}
          >
            <EuiText>
              <p>{item}</p>
            </EuiText>
          </EuiCallOut>
        </Fragment>
      ))}
    </>
  ) : null;

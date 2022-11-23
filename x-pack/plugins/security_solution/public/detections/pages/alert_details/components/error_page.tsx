/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { ERROR_PAGE_TITLE, ERROR_PAGE_BODY } from '../translations';

export const AlertDetailsErrorPage = memo(({ eventId }: { eventId: string }) => {
  return (
    <EuiEmptyPrompt
      color="danger"
      data-test-subj="alert-details-page-error"
      iconType="alert"
      title={<h2>{ERROR_PAGE_TITLE}</h2>}
      body={
        <div>
          <p>{ERROR_PAGE_BODY}</p>
          <p>
            <EuiCode
              style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
            >{`_id: ${eventId}`}</EuiCode>
          </p>
        </div>
      }
    />
  );
});

AlertDetailsErrorPage.displayName = 'AlertDetailsErrorPage';

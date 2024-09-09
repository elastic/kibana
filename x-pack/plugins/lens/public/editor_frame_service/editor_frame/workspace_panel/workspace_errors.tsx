/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { UserMessage } from '../../../types';

interface Props {
  errors: Array<string | UserMessage>;
  title: string;
}

export function WorkspaceErrors(props: Props) {
  const [activePage, setActivePage] = useState(0);

  const activeError = props.errors.length ? props.errors[activePage] : '';

  return (
    <EuiEmptyPrompt
      actions={
        props.errors.length > 1 ? (
          <EuiFlexGroup
            justifyContent="spaceAround"
            data-test-subj="lnsWorkspaceErrorsPaginationControl"
          >
            <EuiFlexItem grow={false}>
              <EuiPagination
                pageCount={props.errors.length}
                activePage={activePage}
                onPageClick={setActivePage}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          []
        )
      }
      body={
        <div data-test-subj="workspace-error-message">
          {typeof activeError === 'string' ? (
            activeError
          ) : (
            <div>
              {activeError.shortMessage}
              {activeError.longMessage ? (
                <>
                  <EuiSpacer />
                  <EuiText size="s"> {activeError.longMessage as React.ReactNode}</EuiText>
                </>
              ) : null}
            </div>
          )}
        </div>
      }
      title={<h2>{props.title}</h2>}
      iconColor="danger"
      iconType="warning"
      data-test-subj="lnsWorkspaceErrors"
    />
  );
}

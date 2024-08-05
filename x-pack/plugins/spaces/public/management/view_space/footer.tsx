/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';

interface Props {
  isDirty: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onUpdateSpace: () => void;
}

export const ViewSpaceTabFooter: React.FC<Props> = ({
  isDirty,
  isLoading,
  onCancel,
  onUpdateSpace,
}) => {
  return (
    <>
      <EuiCallOut
        color="warning"
        iconType="help"
        title="The changes will impact all users in the space"
      >
        <strong>Changes will impact all users in the Space.</strong> The page will be reloaded.
      </EuiCallOut>
      <EuiSpacer />
      {isLoading && (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {!isLoading && (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} color="danger">
              Delete space
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={true} />

          {isDirty && (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onCancel}>Cancel</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  onClick={onUpdateSpace}
                  data-test-subj="save-space-button"
                >
                  Update space
                </EuiButton>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      )}
    </>
  );
};

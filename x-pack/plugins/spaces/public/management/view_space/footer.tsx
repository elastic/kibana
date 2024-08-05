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
  // FIXME show if disable features have changed, or if solution view has changed
  const showUserImpactWarning = () => {
    return (
      <EuiCallOut
        color="warning"
        iconType="help"
        title="Warning"
        data-test-subj="userImpactWarning"
      >
        {' '}
        The changes made will impact all users in the space.{' '}
      </EuiCallOut>
    );
  };

  return (
    <>
      {showUserImpactWarning()}
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

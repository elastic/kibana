/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React from 'react';

interface Props {
  isDirty: boolean;
  isLoading: boolean;
  onClickCancel: () => void;
  onClickSubmit: () => void;
  onClickDeleteSpace: () => void;
}

export const ViewSpaceTabFooter: React.FC<Props> = ({
  isDirty,
  isLoading,
  onClickCancel,
  onClickSubmit,
  onClickDeleteSpace,
}) => {
  return (
    <>
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
            <EuiButtonEmpty onClick={onClickDeleteSpace} color="danger">
              Delete space
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={true} />

          {isDirty && (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClickCancel} data-test-subj="cancel-space-button">
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  onClick={onClickSubmit}
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

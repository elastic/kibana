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

import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  isDirty: boolean;
  isLoading: boolean;
  onClickCancel: () => void;
  onClickSubmit: () => void;
  onClickDeleteSpace: () => void;
}

export const EditSpaceTabFooter: React.FC<Props> = ({
  isDirty,
  isLoading,
  onClickCancel,
  onClickSubmit,
  onClickDeleteSpace,
}) => {
  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup>
      {isDirty && (
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            onClick={onClickSubmit}
            data-test-subj="save-space-button"
          >
            <FormattedMessage
              id="xpack.spaces.management.spaceDetails.footerActions.updateSpace"
              defaultMessage="Apply changes"
            />
          </EuiButton>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onClickCancel} data-test-subj="cancel-space-button">
          <FormattedMessage
            id="xpack.spaces.management.spaceDetails.footerActions.cancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={true} />

      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={onClickDeleteSpace}
          color="danger"
          iconType="trash"
          data-test-subj="delete-space-button"
        >
          <FormattedMessage
            id="xpack.spaces.management.spaceDetails.footerActions.deleteSpace"
            defaultMessage="Delete space"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

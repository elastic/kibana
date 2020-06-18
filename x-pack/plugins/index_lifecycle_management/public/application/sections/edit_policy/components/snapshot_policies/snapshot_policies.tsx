/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiSelect, EuiCallOut } from '@elastic/eui';

import { SectionError } from '../../../../../../../../../src/plugins/es_ui_shared/public';

import { SnapshotPoliciesProps } from './';
import { useLoadSnapshotPolicies } from '../../../../services/api';

export const SnapshotPolicies: React.FunctionComponent<SnapshotPoliciesProps> = ({
  value,
  onChange,
}) => {
  const { error, isLoading, data, sendRequest } = useLoadSnapshotPolicies();
  if (error) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.loadingSnapshotPoliciesErrorMessage"
            defaultMessage="Error loading snapshot policies"
          />
        }
        error={error}
        actions={
          <EuiButton
            onClick={() => sendRequest()}
            color="danger"
            iconType="refresh"
            data-test-subj="reloadSnapshotPoliciesButton"
          >
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.reloadSnapshotPoliciesButtonLabel"
              defaultMessage="Reload snapshot policies"
            />
          </EuiButton>
        }
      />
    );
  }

  if (data.length === 0) {
    return (
      <EuiCallOut
        style={{ maxWidth: 400 }}
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.snapshotPoliciesMissingLabel"
            defaultMessage="No snapshot policies found"
          />
        }
        color="warning"
      >
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.snapshotPoliciesMissingDescription"
          defaultMessage="You haven't created any snapshot policies yet."
        />
      </EuiCallOut>
    );
  }

  return (
    <EuiSelect
      options={data.map((name: string) => ({
        value: name,
        text: name,
      }))}
      isLoading={isLoading}
      hasNoInitialSelection={true}
      value={value}
      onChange={(e) => onChange(e)}
      data-test-subj="snapshotPolicySelect"
    />
  );
};

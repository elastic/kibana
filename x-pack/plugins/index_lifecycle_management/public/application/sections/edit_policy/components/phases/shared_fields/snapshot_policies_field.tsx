/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiComboBoxOptionOption,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import { UseField, ComboBoxField, useFormData } from '../../../../../../shared_imports';
import { useLoadSnapshotPolicies } from '../../../../../services/api';
import { useEditPolicyContext } from '../../../edit_policy_context';

const waitForSnapshotFormField = 'phases.delete.actions.wait_for_snapshot.policy';

export const SnapshotPoliciesField: React.FunctionComponent = () => {
  const { getUrlForApp } = useEditPolicyContext();
  const { error, isLoading, data, resendRequest } = useLoadSnapshotPolicies();
  const [formData] = useFormData({
    watch: waitForSnapshotFormField,
  });

  const selectedSnapshotPolicy = get(formData, waitForSnapshotFormField);

  const policies = data.map((name: string) => ({
    label: name,
    value: name,
  }));

  const getUrlForSnapshotPolicyWizard = () => {
    return getUrlForApp('management', {
      path: `data/snapshot_restore/add_policy`,
    });
  };

  let calloutContent;
  if (error) {
    calloutContent = (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj="policiesErrorCallout"
          iconType="help"
          color="warning"
          title={
            <>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.noPoliciesLoadedTitle"
                defaultMessage="Unable to load existing policies"
              />

              <EuiButtonIcon
                size="s"
                color="warning"
                onClick={resendRequest}
                iconType="refresh"
                aria-label={i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.deletePhase.reloadPoliciesLabel',
                  {
                    defaultMessage: 'Reload policies',
                  }
                )}
              />
            </>
          }
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.noPoliciesLoadedMessage"
            defaultMessage="Refresh this field and enter the name of an existing snapshot policy."
          />
        </EuiCallOut>
      </>
    );
  } else if (data.length === 0) {
    calloutContent = (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj="noPoliciesCallout"
          iconType="help"
          color="warning"
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.noPoliciesCreatedTitle"
              defaultMessage="No snapshot policies found"
            />
          }
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.noPoliciesCreatedMessage"
            defaultMessage="{link} to automate the creation and deletion of cluster snapshots."
            values={{
              link: (
                <EuiLink href={getUrlForSnapshotPolicyWizard()} target="_blank">
                  {i18n.translate(
                    'xpack.indexLifecycleMgmt.editPolicy.deletePhase.noPoliciesCreatedLink',
                    {
                      defaultMessage: 'Create a snapshot lifecycle policy',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      </>
    );
  } else if (selectedSnapshotPolicy && !data.includes(selectedSnapshotPolicy)) {
    calloutContent = (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj="customPolicyCallout"
          iconType="help"
          color="warning"
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.customPolicyTitle"
              defaultMessage="Policy name not found"
            />
          }
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.customPolicyMessage"
            defaultMessage="Enter the name of an existing snapshot policy, or {link} with this name."
            values={{
              link: (
                <EuiLink href={getUrlForSnapshotPolicyWizard()} target="_blank">
                  {i18n.translate(
                    'xpack.indexLifecycleMgmt.editPolicy.deletePhase.customPolicyLink',
                    {
                      defaultMessage: 'create a new policy',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <UseField<string> path={waitForSnapshotFormField}>
        {(field) => {
          const singleSelectionArray: [selectedSnapshot?: string] = field.value
            ? [field.value]
            : [];

          return (
            <ComboBoxField
              field={
                {
                  ...field,
                  value: singleSelectionArray,
                } as any
              }
              euiFieldProps={{
                'data-test-subj': 'snapshotPolicyCombobox',
                options: policies,
                singleSelection: { asPlainText: true },
                isLoading,
                noSuggestions: !!(error || data.length === 0),
                onCreateOption: (newOption: string) => {
                  field.setValue(newOption);
                },
                onChange: (options: EuiComboBoxOptionOption[]) => {
                  if (options.length > 0) {
                    field.setValue(options[0].label);
                  } else {
                    field.setValue('');
                  }
                },
              }}
            />
          );
        }}
      </UseField>
      {calloutContent}
    </>
  );
};

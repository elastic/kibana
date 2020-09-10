/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ApplicationStart } from 'kibana/public';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import { useLoadSnapshotPolicies } from '../../../services/api';

interface Props {
  value: string;
  onChange: (value: string) => void;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}
export const SnapshotPolicies: React.FunctionComponent<Props> = ({
  value,
  onChange,
  getUrlForApp,
}) => {
  const { error, isLoading, data, resendRequest } = useLoadSnapshotPolicies();

  const policies = data.map((name: string) => ({
    label: name,
    value: name,
  }));

  const onComboChange = (options: EuiComboBoxOptionOption[]) => {
    if (options.length > 0) {
      onChange(options[0].label);
    } else {
      onChange('');
    }
  };

  const onCreateOption = (newValue: string) => {
    onChange(newValue);
  };

  const getUrlForSnapshotPolicyWizard = () => {
    return getUrlForApp('management', {
      path: `data/snapshot_restore/add_policy`,
    });
  };

  let calloutContent;
  if (error) {
    calloutContent = (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj="policiesErrorCallout"
          iconType="help"
          color="warning"
          title={
            <Fragment>
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
            </Fragment>
          }
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.noPoliciesLoadedMessage"
            defaultMessage="Refresh this field and enter the name of an existing snapshot policy."
          />
        </EuiCallOut>
      </Fragment>
    );
  } else if (data.length === 0) {
    calloutContent = (
      <Fragment>
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
      </Fragment>
    );
  } else if (value && !data.includes(value)) {
    calloutContent = (
      <Fragment>
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
      </Fragment>
    );
  }

  return (
    <Fragment>
      <EuiComboBox
        data-test-subj="snapshotPolicyCombobox"
        options={policies}
        singleSelection={{ asPlainText: true }}
        isLoading={isLoading}
        onCreateOption={onCreateOption}
        selectedOptions={
          value
            ? [
                {
                  label: value,
                  value,
                },
              ]
            : []
        }
        onChange={onComboChange}
        noSuggestions={!!(error || data.length === 0)}
      />
      {calloutContent}
    </Fragment>
  );
};

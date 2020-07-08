/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiSpacer,
} from '@elastic/eui';

import { useLoadSnapshotPolicies } from '../../../../services/api';

interface Props {
  value: string;
  onChange: (value: string) => void;
}
export const SnapshotPolicies: React.FunctionComponent<Props> = ({ value, onChange }) => {
  const { error, isLoading, data, sendRequest } = useLoadSnapshotPolicies();

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

  let calloutContent;
  if (error) {
    calloutContent = (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj="policiesErrorCallout"
          size="s"
          iconType="help"
          color="warning"
          title={
            <Fragment>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.noPoliciesLoadedTitle"
                defaultMessage="Unable to load existing policies."
              />

              <EuiButtonIcon
                size="s"
                color="warning"
                onClick={sendRequest}
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
            defaultMessage="You still can enter a policy name to search for."
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
          size="s"
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
            defaultMessage="Enter a name to use for a new snapshot policy."
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
          size="s"
          iconType="help"
          color="warning"
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.customPolicyTitle"
              defaultMessage="Policy name not found."
            />
          }
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.customPolicyMessage"
            defaultMessage="However, you can create a new policy with this name."
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

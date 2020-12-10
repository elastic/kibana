/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, Fragment } from 'react';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiTextColor, EuiFormRow } from '@elastic/eui';

import { useFormData, UseField, ToggleField } from '../../../../../../shared_imports';

import { ActiveBadge, LearnMoreLink, OptionalLabel } from '../../index';

import { MinAgeInputField, SnapshotPoliciesField } from '../shared_fields';

const formFieldPaths = {
  enabled: '_meta.delete.enabled',
};

export const DeletePhase: FunctionComponent = () => {
  const [formData] = useFormData({
    watch: formFieldPaths.enabled,
  });

  const enabled = get(formData, formFieldPaths.enabled);

  return (
    <div id="deletePhaseContent" aria-live="polite" role="region">
      <EuiDescribedFormGroup
        title={
          <div>
            <h2 className="eui-displayInlineBlock eui-alignMiddle">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseLabel"
                defaultMessage="Delete phase"
              />
            </h2>{' '}
            {enabled && <ActiveBadge />}
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescriptionText"
                defaultMessage="You no longer need your index.  You can define when it is safe to delete it."
              />
            </p>
            <UseField
              path={formFieldPaths.enabled}
              component={ToggleField}
              componentProps={{
                euiFieldProps: {
                  'data-test-subj': 'enablePhaseSwitch-delete',
                  'aria-controls': 'deletePhaseContent',
                },
              }}
            />
          </Fragment>
        }
        fullWidth
      >
        {enabled && <MinAgeInputField phase="delete" />}
      </EuiDescribedFormGroup>
      {enabled ? (
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.waitForSnapshotTitle"
                defaultMessage="Wait for snapshot policy"
              />
            </h3>
          }
          description={
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.waitForSnapshotDescription"
                defaultMessage="Specify a snapshot policy to be executed before the deletion of the index. This ensures that a snapshot of the deleted index is available."
              />{' '}
              <LearnMoreLink docPath="ilm-wait-for-snapshot.html" />
            </EuiTextColor>
          }
          titleSize="xs"
          fullWidth
        >
          <EuiFormRow
            id="deletePhaseWaitForSnapshot"
            label={
              <Fragment>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.waitForSnapshotLabel"
                  defaultMessage="Snapshot policy name"
                />
                <OptionalLabel />
              </Fragment>
            }
          >
            <SnapshotPoliciesField />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      ) : null}
    </div>
  );
};

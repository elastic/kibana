/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { UseField, NumericField } from '../../../../../../shared_imports';
import { useEditPolicyContext } from '../../../edit_policy_context';
import { DescribedFormRow } from '../../described_form_row';

interface Props {
  phase: 'warm' | 'cold';
}

export const ReplicasField: FunctionComponent<Props> = ({ phase }) => {
  const { policy } = useEditPolicyContext();
  const initialValue = policy.phases[phase]?.actions?.allocate?.number_of_replicas != null;
  return (
    <DescribedFormRow
      title={
        <h3>
          {i18n.translate('xpack.indexLifecycleMgmt.numberOfReplicas.formRowTitle', {
            defaultMessage: 'Replicas',
          })}
        </h3>
      }
      description={i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.numberOfReplicas.formRowDescription',
        {
          defaultMessage:
            'Set the number of replicas. Remains the same as the previous phase by default.',
        }
      )}
      switchProps={{
        'data-test-subj': `${phase}-setReplicasSwitch`,
        label: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.numberOfReplicas.switchLabel', {
          defaultMessage: 'Set replicas',
        }),
        initialValue,
      }}
      fullWidth
    >
      <UseField
        path={`phases.${phase}.actions.allocate.number_of_replicas`}
        component={NumericField}
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            'data-test-subj': `${phase}-selectedReplicaCount`,
            min: 0,
          },
        }}
      />
    </DescribedFormRow>
  );
};

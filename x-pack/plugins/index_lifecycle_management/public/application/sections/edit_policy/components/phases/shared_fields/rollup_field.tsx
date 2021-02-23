/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiButtonEmpty } from '@elastic/eui';

import { reactRouterNavigate } from '../../../../../../../../../../src/plugins/kibana_react/public';

import { SerializedPolicy } from '../../../../../../../common/types';

import { useFormContext } from '../../../../../../shared_imports';

import { useAppContext } from '../../../../../app_context';
import { getPolicyRollupWizardPath } from '../../../../../services/navigation';

import { useEditPolicyContext } from '../../../edit_policy_context';

import { ToggleFieldWithDescribedFormRow } from '../../../components';

interface Props {
  phase: 'hot' | 'cold';
}

export const RollupField: FunctionComponent<Props> = ({ phase }) => {
  const initialValue = true;
  const history = useHistory();
  const form = useFormContext<SerializedPolicy>();
  const { isNewPolicy } = useEditPolicyContext();
  const { setCurrentPolicyData } = useAppContext();

  return (
    <ToggleFieldWithDescribedFormRow
      title={<h3>Rollup</h3>}
      description="Use rollups to precalculate aggregations and save storage space"
      switchProps={{
        path: `_meta.${phase}.rollupEnabled`,
        'data-test-subj': `${phase}-setReplicasSwitch`,
        initialValue,
      }}
      fullWidth
    >
      <EuiButtonEmpty
        iconType="plusInACircle"
        onClick={(e: React.MouseEvent) => {
          setCurrentPolicyData({ policy: form.getFormData(), isNewPolicy });
          reactRouterNavigate(history, getPolicyRollupWizardPath(phase)).onClick(e);
        }}
      >
        Configure rollup
      </EuiButtonEmpty>
    </ToggleFieldWithDescribedFormRow>
  );
};

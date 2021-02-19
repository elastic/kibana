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

// import { useForm } from '../../../../../../shared_imports';

// import { useAppContext } from '../../../../../app_context';
import { getPolicyRollupWizardPath } from '../../../../../services/navigation';

import { DescribedFormRow } from '../../described_form_row';

export const RollupField: FunctionComponent = () => {
  const phase = 'cold';
  const initialValue = true;
  const history = useHistory();
  // const form = useForm();
  // const { setCurrentPolicy } = useAppContext();
  return (
    <DescribedFormRow
      title={<h3>Rollup</h3>}
      description="Use rollups to precalculate aggregations and save storage space"
      switchProps={{
        'data-test-subj': `${phase}-setReplicasSwitch`,
        label: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.rollup.switchLabel', {
          defaultMessage: 'Set rollup',
        }),
        initialValue,
      }}
      fullWidth
    >
      <EuiButtonEmpty
        iconType="plusInACircle"
        {...reactRouterNavigate(history, getPolicyRollupWizardPath())}
      >
        Configure rollup
      </EuiButtonEmpty>
    </DescribedFormRow>
  );
};

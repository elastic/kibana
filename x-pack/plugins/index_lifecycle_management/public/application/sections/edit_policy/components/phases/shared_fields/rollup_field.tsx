/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import qs from 'query-string';
import React, { FunctionComponent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiButtonEmpty } from '@elastic/eui';

import { DescribedFormRow } from '../../../../components';
import { useEditPolicyContext } from '../../../edit_policy_context';

interface Props {
  phase: 'hot' | 'cold';
}

export const RollupField: FunctionComponent<Props> = ({ phase }) => {
  const history = useHistory();
  const { rollup } = useEditPolicyContext();
  const [enabled, setEnabled] = useState(() => rollup.getCurrent()[phase].enabled);
  return (
    <DescribedFormRow
      title={<h3>Rollup</h3>}
      description="Use rollups to precalculate aggregations and save storage space"
      switchProps={{
        'data-test-subj': `${phase}-setReplicasSwitch`,
        label: i18n.translate('xpack.indexLifecycleMgmt.rollup.enabledFieldLabel', {
          defaultMessage: 'Set rollup',
        }),
        checked: enabled,
        onChange: (value) => {
          const currentConfig = rollup.getCurrent();
          rollup.setCurrent({
            ...currentConfig,
            [phase]: {
              ...currentConfig[phase],
              enabled: value,
            },
          });
          setEnabled(value);
        },
      }}
      fullWidth
    >
      <EuiButtonEmpty
        iconType="plusInACircle"
        onClick={() => {
          history.push({ search: qs.stringify({ rollup: phase }) });
        }}
      >
        Configure rollup
      </EuiButtonEmpty>
    </DescribedFormRow>
  );
};

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
import { useRollupFormContext } from '../../../rollup_form_context';

interface Props {
  phase: 'hot' | 'cold';
}

export const RollupField: FunctionComponent<Props> = ({ phase }) => {
  const history = useHistory();
  const { getCurrent, setCurrent } = useRollupFormContext();
  const {
    [phase]: { enabled },
  } = getCurrent();
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
          setCurrent((currentConfig) => ({
            ...currentConfig,
            [phase]: {
              ...currentConfig[phase],
              enabled: value,
            },
          }));
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

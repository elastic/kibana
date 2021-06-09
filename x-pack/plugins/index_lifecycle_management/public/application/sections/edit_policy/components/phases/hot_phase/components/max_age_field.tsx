/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { NumericField, SelectField } from '../../../../../../../shared_imports';
import { UseField } from '../../../../form';
import { ROLLOVER_FORM_PATHS } from '../../../../constants';

import { maxAgeUnits } from '../constants';

export const MaxAgeField: FunctionComponent = () => {
  return (
    <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
      <EuiFlexItem style={{ maxWidth: 188 }}>
        <UseField
          path={ROLLOVER_FORM_PATHS.maxAge}
          component={NumericField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': `hot-selectedMaxAge`,
              min: 1,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ maxWidth: 188 }}>
        <UseField
          key="_meta.hot.customRollover.maxAgeUnit"
          path="_meta.hot.customRollover.maxAgeUnit"
          component={SelectField}
          componentProps={{
            'data-test-subj': `hot-selectedMaxAgeUnits`,
            hasEmptyLabelSpace: true,
            euiFieldProps: {
              'aria-label': i18n.translate(
                'xpack.indexLifecycleMgmt.hotPhase.maximumAgeUnitsAriaLabel',
                {
                  defaultMessage: 'Maximum age units',
                }
              ),
              options: maxAgeUnits,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

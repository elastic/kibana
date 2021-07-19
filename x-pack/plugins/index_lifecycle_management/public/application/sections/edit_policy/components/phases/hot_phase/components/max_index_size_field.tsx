/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

import { NumericField } from '../../../../../../../shared_imports';
import { UseField } from '../../../../form';
import { ROLLOVER_FORM_PATHS } from '../../../../constants';
import { UnitField } from './unit_field';

import { maxSizeStoredUnits } from '../constants';

const i18nTexts = {
  deprecationMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeDeprecationMessage',
    {
      defaultMessage:
        'Maximum index size is deprecated and will be removed in a future version. Use maximum primary shard size instead.',
    }
  ),
  maxSizeUnit: {
    ariaLabel: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeUnitsAriaLabel', {
      defaultMessage: 'Maximum index size units',
    }),
  },
};

export const MaxIndexSizeField: FunctionComponent = () => {
  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="s">
      <EuiFlexItem>
        <UseField
          path={ROLLOVER_FORM_PATHS.maxSize}
          component={NumericField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'hot-selectedMaxSizeStored',
              min: 1,
              prepend: (
                <EuiIconTip
                  type="alert"
                  aria-label={i18nTexts.deprecationMessage}
                  content={i18nTexts.deprecationMessage}
                />
              ),
              append: (
                <UnitField
                  path="_meta.hot.customRollover.maxStorageSizeUnit"
                  options={maxSizeStoredUnits}
                  euiFieldProps={{
                    'data-test-subj': 'hot-selectedMaxSizeStoredUnits',
                    'aria-label': i18nTexts.maxSizeUnit.ariaLabel,
                  }}
                />
              ),
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

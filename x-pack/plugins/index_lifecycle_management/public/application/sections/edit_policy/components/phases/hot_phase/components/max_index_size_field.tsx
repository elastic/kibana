/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { NumericField, SelectField, useFormData } from '../../../../../../../shared_imports';
import { UseField } from '../../../../form';
import { ROLLOVER_FORM_PATHS } from '../../../../constants';

import { FieldDeprecationWarning } from '../../../../components';

import { maxSizeStoredUnits } from '../constants';

const i18nTexts = {
  deprecationMessage: i18n.translate(
    'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeDeprecationMessage',
    {
      defaultMessage:
        'Maximum index size is deprecated and will be removed in future versions of the Elastic stack. Please use maximum primary shard size instead.',
    }
  ),
  maxSizeUnit: {
    ariaLabel: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeUnitsAriaLabel', {
      defaultMessage: 'Maximum index size units',
    }),
  },
};

export const MaxIndexSizeField: FunctionComponent = () => {
  const [formData] = useFormData({ watch: ROLLOVER_FORM_PATHS.maxSize });
  const showDeprecationWarning = !!get(formData, ROLLOVER_FORM_PATHS.maxSize);
  return (
    <FieldDeprecationWarning
      message={i18nTexts.deprecationMessage}
      isShowing={showDeprecationWarning}
      data-test-subj="maxIndexSizeFieldDeprecationWarning-hot"
    >
      <EuiFlexGroup>
        <EuiFlexItem style={{ maxWidth: 188 }}>
          <UseField
            path={ROLLOVER_FORM_PATHS.maxSize}
            component={NumericField}
            componentProps={{
              euiFieldProps: { 'data-test-subj': 'hot-selectedMaxSizeStored', min: 1 },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ maxWidth: 188 }}>
          <UseField
            key="_meta.hot.customRollover.maxStorageSizeUnit"
            path="_meta.hot.customRollover.maxStorageSizeUnit"
            component={SelectField}
            componentProps={{
              'data-test-subj': `hot-selectedMaxSizeStoredUnits`,
              hasEmptyLabelSpace: true,
              euiFieldProps: {
                options: maxSizeStoredUnits,
                'aria-label': i18nTexts.maxSizeUnit.ariaLabel,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </FieldDeprecationWarning>
  );
};

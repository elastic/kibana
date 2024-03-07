/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiComboBox } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useAppDependencies } from '../../../../app_dependencies';

import { useWizardActions } from '../../state_management/create_transform_store';

import { usePivotConfigOptions } from '../step_define/hooks/use_pivot_config';

const placeholder = i18n.translate('xpack.transform.stepDefineForm.groupByPlaceholder', {
  defaultMessage: 'Add a group by field ...',
});

export const GroupByDropDown: FC = () => {
  const {
    ml: { useFieldStatsTrigger },
  } = useAppDependencies();
  const { closeFlyout, renderOption } = useFieldStatsTrigger();

  const { groupByOptions } = usePivotConfigOptions();
  const {
    pivotConfig: { addGroupBy },
  } = useWizardActions();

  return (
    <EuiComboBox
      fullWidth
      placeholder={placeholder}
      singleSelection={{ asPlainText: true }}
      options={groupByOptions}
      selectedOptions={[]}
      onChange={(option) => {
        addGroupBy(option);
        closeFlyout();
      }}
      isClearable={false}
      data-test-subj="transformGroupBySelection"
      renderOption={renderOption}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC } from 'react';

import { EuiComboBox } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useAppDependencies } from '../../../../app_dependencies';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';

import { getPivotDropdownOptions } from '../step_define/common/get_pivot_dropdown_options';
import { useWizardContext } from '../wizard/wizard';

const placeholder = i18n.translate('xpack.transform.stepDefineForm.groupByPlaceholder', {
  defaultMessage: 'Add a group by field ...',
});

export const GroupByDropDown: FC = () => {
  const {
    ml: { useFieldStatsTrigger },
  } = useAppDependencies();
  const { closeFlyout, renderOption } = useFieldStatsTrigger();
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);

  const { groupByOptions } = useMemo(
    () => getPivotDropdownOptions(dataView, runtimeMappings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtimeMappings]
  );

  const { pivotConfig: actions } = useWizardActions();
  const { addGroupBy } = actions;

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, Fragment, type FC } from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { AggName } from '../../../../../../common/types/aggregations';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';

import { getPivotDropdownOptions } from '../step_define/common/get_pivot_dropdown_options';
import { useWizardContext } from '../wizard/wizard';

import { GroupByLabelForm } from './group_by_label_form';

export const GroupByListForm: FC = () => {
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const { pivotConfig: actions } = useWizardActions();
  const { deleteGroupBy, updateGroupBy } = actions;

  const list = useWizardSelector((s) => s.stepDefine.groupByList);
  const listKeys = Object.keys(list);

  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);

  const { groupByOptionsData } = useMemo(
    () => getPivotDropdownOptions(dataView, runtimeMappings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtimeMappings]
  );
  return (
    <>
      {listKeys.map((aggName: AggName, i) => {
        const otherAggNames = listKeys.filter((k) => k !== aggName);
        return (
          <Fragment key={aggName}>
            <EuiPanel paddingSize="s" data-test-subj={`transformGroupByEntry ${i}`}>
              <GroupByLabelForm
                deleteHandler={deleteGroupBy}
                item={list[aggName]}
                otherAggNames={otherAggNames}
                onChange={(item) => updateGroupBy(aggName, item)}
                options={groupByOptionsData}
              />
            </EuiPanel>
            {listKeys.length > 0 && <EuiSpacer size="s" />}
          </Fragment>
        );
      })}
    </>
  );
};

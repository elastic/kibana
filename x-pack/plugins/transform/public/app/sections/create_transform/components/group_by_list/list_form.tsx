/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, type FC } from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { AggName } from '../../../../../../common/types/aggregations';

import { useWizardSelector } from '../../state_management/create_transform_store';

import { GroupByLabelForm } from './group_by_label_form';

export const GroupByListForm: FC = () => {
  const list = useWizardSelector((s) => s.stepDefine.groupByList);
  const listKeys = Object.keys(list);

  return (
    <>
      {listKeys.map((aggName: AggName, i) => {
        const otherAggNames = listKeys.filter((k) => k !== aggName);
        return (
          <Fragment key={aggName}>
            <EuiPanel paddingSize="s" data-test-subj={`transformGroupByEntry ${i}`}>
              <GroupByLabelForm item={list[aggName]} otherAggNames={otherAggNames} />
            </EuiPanel>
            {listKeys.length > 0 && <EuiSpacer size="s" />}
          </Fragment>
        );
      })}
    </>
  );
};

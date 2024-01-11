/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, Fragment, type FC } from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { useWizardSelector } from '../../state_management/create_transform_store';

import { AggLabelForm } from './agg_label_form';

interface AggListFormProps {
  parentAggId?: string;
}

export const AggListForm: FC<AggListFormProps> = ({ parentAggId }) => {
  const aggList = useWizardSelector((s) => s.stepDefine.aggList);
  const filteredList = useMemo(
    () =>
      parentAggId
        ? Object.values(aggList).filter((d) => d.parentAggId === parentAggId)
        : Object.values(aggList),
    [aggList, parentAggId]
  );
  const aggNames = useMemo(() => filteredList.map((d) => d.aggName), [filteredList]);

  return (
    <>
      {filteredList.map((item, i) => {
        const otherAggNames = aggNames.filter((k) => k !== item.aggName);
        return (
          <Fragment key={item.aggId}>
            <EuiPanel paddingSize="s" data-test-subj={`transformAggregationEntry_${i}`}>
              <AggLabelForm item={item} otherAggNames={otherAggNames} parentAggId={parentAggId} />
            </EuiPanel>
            {filteredList.length > 0 && <EuiSpacer size="s" />}
          </Fragment>
        );
      })}
    </>
  );
};

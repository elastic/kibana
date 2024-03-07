/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AggListForm } from './list_form';
import { AggListDropDown } from '../pivot_configuration_dropdown/agg_list_dropdown';
import { PivotAggsConfig } from '../../../../common';

/**
 * Component for managing sub-aggregation of the provided
 * aggregation item.
 */
export const SubAggsSection: FC<{ item: PivotAggsConfig }> = ({ item }) => {
  return (
    <>
      <EuiSpacer size="m" />
      {item.subAggs && <AggListForm parentAggId={item.aggId} />}
      <AggListDropDown parentAggId={item.aggId} />
    </>
  );
};

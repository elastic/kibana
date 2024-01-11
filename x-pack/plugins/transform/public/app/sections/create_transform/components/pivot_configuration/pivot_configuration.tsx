/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AggListForm } from '../aggregation_list';
import { AggListDropDown } from '../pivot_configuration_dropdown/agg_list_dropdown';
import { GroupByDropDown } from '../pivot_configuration_dropdown/group_by_dropdown';
import { GroupByListForm } from '../group_by_list';

export const PivotConfiguration: FC = () => (
  <>
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.transform.stepDefineForm.groupByLabel', {
        defaultMessage: 'Group by',
      })}
    >
      <>
        <GroupByListForm />
        <GroupByDropDown />
      </>
    </EuiFormRow>

    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.transform.stepDefineForm.aggregationsLabel', {
        defaultMessage: 'Aggregations',
      })}
    >
      <>
        <AggListForm />
        <AggListDropDown />
      </>
    </EuiFormRow>
  </>
);

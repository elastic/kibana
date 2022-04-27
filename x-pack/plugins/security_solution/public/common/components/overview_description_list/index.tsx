/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { DescriptionList } from '../../../../common/utility_types';
import { DescriptionListStyled } from '../page';

export const OverviewDescriptionList = ({
  dataTestSubj,
  descriptionList,
}: {
  dataTestSubj?: string;
  descriptionList: DescriptionList[];
}) => (
  <EuiFlexItem grow={true}>
    <DescriptionListStyled data-test-subj={dataTestSubj} listItems={descriptionList} />
  </EuiFlexItem>
);

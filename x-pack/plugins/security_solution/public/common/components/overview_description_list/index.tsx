/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { DescriptionList } from '../../../../common/utility_types';
import { DescriptionListStyled } from '../../../common/components/page';

export const OverviewDescriptionList = ({
  dataTestSubj,
  descriptionList,
  isInDetailsSidePanel = false,
}: {
  dataTestSubj?: string;
  descriptionList: DescriptionList[];
  isInDetailsSidePanel: boolean;
}) => (
  <EuiFlexItem grow={!isInDetailsSidePanel}>
    <DescriptionListStyled data-test-subj={dataTestSubj} listItems={descriptionList} />
  </EuiFlexItem>
);

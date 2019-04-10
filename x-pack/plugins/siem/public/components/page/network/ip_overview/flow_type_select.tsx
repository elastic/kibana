/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { IpOverviewType } from '../../../../graphql/types';
import { IPDetailsDispatchProps } from '../../../../pages/network/ip_details';

import { IpOverviewId } from '.';
import * as i18n from './translations';

const toggleTypeOptions = (id: string) => [
  {
    id: `${id}-${IpOverviewType.source}`,
    value: IpOverviewType.source,
    inputDisplay: i18n.AS_SOURCE,
  },
  {
    id: `${id}-${IpOverviewType.destination}`,
    value: IpOverviewType.destination,
    inputDisplay: i18n.AS_DESTINATION,
  },
];

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

interface OwnProps {
  loading: boolean;
  flowType: IpOverviewType;
}
export type FlowTypeSelectProps = OwnProps & IPDetailsDispatchProps;

const onChangeType = (
  flowType: IpOverviewType,
  updateIpOverviewFlowType: ActionCreator<{
    flowType: IpOverviewType;
  }>
) => {
  updateIpOverviewFlowType({ flowType });
};

export const FlowTypeSelectComponent = pure<FlowTypeSelectProps>(
  ({ loading = false, flowType, updateIpOverviewFlowType }) => {
    const id = `${IpOverviewId}-select-type`;
    const selectedType = flowType;
    return (
      <SelectTypeItem grow={false}>
        <EuiSuperSelect
          options={toggleTypeOptions(id)}
          valueOfSelected={selectedType}
          onChange={newFlowType => onChangeType(newFlowType, updateIpOverviewFlowType)}
          isLoading={loading}
        />
      </SelectTypeItem>
    );
  }
);

export const FlowTypeSelect = FlowTypeSelectComponent;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { FlowDirection, FlowTarget } from '../../../graphql/types';
import * as i18nIp from '../details/translations';

import { FlowTargetSelect } from '../flow_controls/flow_target_select';
import { IpOverviewId } from '../../../timelines/components/field_renderers/field_renderers';

const SelectTypeItem = styled(EuiFlexItem)`
  min-width: 180px;
`;

SelectTypeItem.displayName = 'SelectTypeItem';

interface Props {
  flowTarget: FlowTarget;
}

const getUpdatedFlowTargetPath = (
  location: Location,
  currentFlowTarget: FlowTarget,
  newFlowTarget: FlowTarget
) => {
  const newPathame = location.pathname.replace(currentFlowTarget, newFlowTarget);

  return `${newPathame}${location.search}`;
};

export const FlowTargetSelectConnectedComponent: React.FC<Props> = ({ flowTarget }) => {
  const history = useHistory();
  const location = useLocation();

  const updateNetworkDetailsFlowTarget = useCallback(
    (newFlowTarget: FlowTarget) => {
      const newPath = getUpdatedFlowTargetPath(location, flowTarget, newFlowTarget);
      history.push(newPath);
    },
    [history, location, flowTarget]
  );

  return (
    <SelectTypeItem grow={false} data-test-subj={`${IpOverviewId}-select-flow-target`}>
      <FlowTargetSelect
        id={IpOverviewId}
        isLoading={!flowTarget}
        selectedDirection={FlowDirection.uniDirectional}
        selectedTarget={flowTarget}
        displayTextOverride={[i18nIp.AS_SOURCE, i18nIp.AS_DESTINATION]}
        updateFlowTargetAction={updateNetworkDetailsFlowTarget}
      />
    </SelectTypeItem>
  );
};

export const FlowTargetSelectConnected = React.memo(FlowTargetSelectConnectedComponent);

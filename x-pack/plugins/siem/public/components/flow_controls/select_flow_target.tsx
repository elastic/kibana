/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import { FlowDirection, FlowTarget } from '../../graphql/types';

import * as i18n from './translations';

const toggleTargetOptions = (id: string, displayText: string[]) => [
  {
    id: `${id}-select-flow-target-${FlowTarget.source}`,
    value: FlowTarget.source,
    inputDisplay: displayText[0] || i18n.SOURCE,
    directions: [FlowDirection.uniDirectional, FlowDirection.biDirectional],
  },
  {
    id: `${id}-select-flow-target-${FlowTarget.destination}`,
    value: FlowTarget.destination,
    inputDisplay: displayText[1] || i18n.DESTINATION,
    directions: [FlowDirection.uniDirectional, FlowDirection.biDirectional],
  },
  {
    id: `${id}-select-flow-target-${FlowTarget.client}`,
    value: FlowTarget.client,
    inputDisplay: displayText[2] || i18n.CLIENT,
    directions: [FlowDirection.biDirectional],
  },
  {
    id: `${id}-select-flow-target-${FlowTarget.server}`,
    value: FlowTarget.server,
    inputDisplay: displayText[3] || i18n.SERVER,
    directions: [FlowDirection.biDirectional],
  },
];

interface Props {
  id: string;
  isLoading: boolean;
  onChangeTarget: (value: FlowTarget) => void;
  selectedTarget: FlowTarget;
  displayTextOverride?: string[];
  selectedDirection?: FlowDirection;
}

export const SelectFlowTarget = pure<Props>(
  ({
    id,
    isLoading = false,
    onChangeTarget,
    selectedDirection,
    selectedTarget,
    displayTextOverride = [],
  }) => (
    <EuiSuperSelect
      options={
        selectedDirection
          ? toggleTargetOptions(id, displayTextOverride).filter(option =>
              option.directions.includes(selectedDirection)
            )
          : toggleTargetOptions(id, displayTextOverride)
      }
      valueOfSelected={selectedTarget}
      onChange={onChangeTarget}
      isLoading={isLoading}
    />
  )
);

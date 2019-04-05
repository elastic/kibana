/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import { FlowTarget } from '../../../../graphql/types';

import * as i18n from './translations';

const toggleTypeOptions = (id: string) => [
  {
    id: `${id}-${FlowTarget.source}`,
    value: FlowTarget.source,
    inputDisplay: i18n.AS_SOURCE,
  },
  {
    id: `${id}-${FlowTarget.destination}`,
    value: FlowTarget.destination,
    inputDisplay: i18n.AS_DESTINATION,
  },
];

interface Props {
  id: string;
  selectedType: FlowTarget;
  onChangeType: (value: FlowTarget) => void;
  isLoading: boolean;
}

export const SelectType = pure<Props>(({ id, isLoading = false, onChangeType, selectedType }) => (
  <EuiSuperSelect
    options={toggleTypeOptions(id)}
    valueOfSelected={selectedType}
    onChange={onChangeType}
    isLoading={isLoading}
  />
));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionMap, Container as ConstateContainer, OnMount } from 'constate';
import mergeAll from 'lodash/fp/mergeAll';
import React from 'react';

import { memoizeLast } from 'ui/utils/memoize';
import { convertChangeToUpdater } from '../../../common/source_configuration';
import { UpdateSourceInput } from '../../graphql/types';
import { RendererFunction } from '../../utils/typed_react';

export interface InputFieldProps<
  Value extends string = string,
  FieldElement extends HTMLElement = HTMLInputElement
> {
  name: string;
  onChange?: React.ChangeEventHandler<FieldElement>;
  value?: Value;
}

interface FormState {
  name: string;
  description: string;
  metricAlias: string;
  logAlias: string;
  fields: {
    container: string;
    host: string;
    pod: string;
    tiebreaker: string;
    timestamp: string;
  };
}

interface State {
  updates: UpdateSourceInput[];
}

interface Actions {
  resetForm: () => void;
  updateName: (name: string) => void;
  updateLogAlias: (value: string) => void;
  updateMetricAlias: (value: string) => void;
  updateField: (field: keyof FormState['fields'], value: string) => void;
}

const actions: ActionMap<State, Actions> = {
  resetForm: () => state => ({
    ...state,
    updates: [],
  }),
  updateName: name => state => ({
    ...state,
    updates: addOrCombineLastUpdate(state.updates, { setName: { name } }),
  }),
  updateLogAlias: logAlias => state => ({
    ...state,
    updates: addOrCombineLastUpdate(state.updates, { setAliases: { logAlias } }),
  }),
  updateMetricAlias: metricAlias => state => ({
    ...state,
    updates: addOrCombineLastUpdate(state.updates, { setAliases: { metricAlias } }),
  }),
  updateField: (field, value) => state => ({
    ...state,
    updates: addOrCombineLastUpdate(state.updates, { setFields: { [field]: value } }),
  }),
};

interface WithSourceConfigurationFormStateProps {
  children: RendererFunction<
    State &
      Actions & {
        currentFormState: FormState;
        getNameFieldProps: () => InputFieldProps;
        getLogAliasFieldProps: () => InputFieldProps;
        getMetricAliasFieldProps: () => InputFieldProps;
        getFieldFieldProps: (field: keyof FormState['fields']) => InputFieldProps;
      }
  >;
  initialFormState: FormState;
  onMount?: OnMount<State>;
}

export const WithSourceConfigurationFormState: React.SFC<WithSourceConfigurationFormStateProps> = ({
  children,
  initialFormState,
  onMount,
}) => (
  <ConstateContainer
    actions={actions}
    context="source-configuration-form"
    initialState={{ updates: [] } as State}
    onMount={onMount}
  >
    {args => {
      const currentFormState = getCurrentFormState(initialFormState, args.updates);
      return children({
        ...args,
        currentFormState,
        getNameFieldProps: () => ({
          name: 'name',
          onChange: evt => args.updateName(evt.currentTarget.value),
          value: currentFormState.name,
        }),
        getLogAliasFieldProps: () => ({
          name: 'logAlias',
          onChange: evt => args.updateLogAlias(evt.currentTarget.value),
          value: currentFormState.logAlias,
        }),
        getMetricAliasFieldProps: () => ({
          name: 'metricAlias',
          onChange: evt => args.updateMetricAlias(evt.currentTarget.value),
          value: currentFormState.metricAlias,
        }),
        getFieldFieldProps: field => ({
          name: `${field}Field`,
          onChange: evt => args.updateField(field, evt.currentTarget.value),
          value: currentFormState.fields[field],
        }),
      });
    }}
  </ConstateContainer>
);

const getCurrentFormState = memoizeLast(
  (initialFormState: FormState, updates: UpdateSourceInput[]) =>
    updates.map(convertChangeToUpdater).reduce((state, updater) => updater(state), initialFormState)
);

const addOrCombineLastUpdate = (updates: UpdateSourceInput[], newUpdate: UpdateSourceInput) => [
  ...updates.slice(0, -1),
  ...maybeCombineUpdates(updates[updates.length - 1], newUpdate),
];

/**
 * Tries to combine the given updates by naively checking whether they can be
 * merged into one update.
 *
 * This is only judged to be the case when all of the following conditions are
 * met:
 *
 * 1. The update only contains one operation.
 * 2. The operation is the same on in both updates.
 * 3. The operation is known to be safe to combine.
 */
const maybeCombineUpdates = (
  firstUpdate: UpdateSourceInput | undefined,
  secondUpdate: UpdateSourceInput
): UpdateSourceInput[] => {
  if (!firstUpdate) {
    return [secondUpdate];
  }

  const firstKeys = Object.keys(firstUpdate);
  const secondKeys = Object.keys(secondUpdate);

  const isSingleOperation = firstKeys.length === secondKeys.length && firstKeys.length === 1;
  const isSameOperation = firstKeys[0] === secondKeys[0];
  // to guard against future operations, which might not be safe to merge naively
  const isMergeableOperation = mergeableOperations.indexOf(firstKeys[0]) > -1;

  if (isSingleOperation && isSameOperation && isMergeableOperation) {
    return [mergeAll([firstUpdate, secondUpdate])];
  }

  return [firstUpdate, secondUpdate];
};

const mergeableOperations = ['setName', 'setDescription', 'setAliases', 'setFields'];

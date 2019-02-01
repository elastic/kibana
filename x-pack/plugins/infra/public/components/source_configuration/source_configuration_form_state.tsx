/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionMap, Container as ConstateContainer, OnMount, SelectorMap } from 'constate';
import mergeAll from 'lodash/fp/mergeAll';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { memoizeLast } from 'ui/utils/memoize';
import { convertChangeToUpdater } from '../../../common/source_configuration';
import { UpdateSourceInput } from '../../graphql/types';
import { RendererFunction } from '../../utils/typed_react';

export interface InputFieldProps<
  Value extends string = string,
  FieldElement extends HTMLInputElement = HTMLInputElement
> {
  error: React.ReactNode[];
  isInvalid: boolean;
  name: string;
  onChange?: React.ChangeEventHandler<FieldElement>;
  value?: Value;
}

type FieldErrorMessage = string | JSX.Element;

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

interface Selectors {
  getCurrentFormState: () => FormState;
  getNameFieldValidationErrors: () => FieldErrorMessage[];
  getLogAliasFieldValidationErrors: () => FieldErrorMessage[];
  getMetricAliasFieldValidationErrors: () => FieldErrorMessage[];
  getFieldFieldValidationErrors: (field: keyof FormState['fields']) => FieldErrorMessage[];
  isFormValid: () => boolean;
}

const createContainerProps = memoizeLast((initialFormState: FormState) => {
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

  const getCurrentFormState = memoizeLast(
    (previousFormState: FormState, updates: UpdateSourceInput[]) =>
      updates
        .map(convertChangeToUpdater)
        .reduce((state, updater) => updater(state), previousFormState)
  );

  const selectors: SelectorMap<State, Selectors> = {
    getCurrentFormState: () => ({ updates }) => getCurrentFormState(initialFormState, updates),
    getNameFieldValidationErrors: () => state =>
      validateInputFieldNotEmpty(selectors.getCurrentFormState()(state).name),
    getLogAliasFieldValidationErrors: () => state =>
      validateInputFieldNotEmpty(selectors.getCurrentFormState()(state).logAlias),
    getMetricAliasFieldValidationErrors: () => state =>
      validateInputFieldNotEmpty(selectors.getCurrentFormState()(state).metricAlias),
    getFieldFieldValidationErrors: field => state =>
      validateInputFieldNotEmpty(selectors.getCurrentFormState()(state).fields[field]),
    isFormValid: () => state =>
      [
        selectors.getNameFieldValidationErrors()(state),
        selectors.getLogAliasFieldValidationErrors()(state),
        selectors.getMetricAliasFieldValidationErrors()(state),
        selectors.getFieldFieldValidationErrors('container')(state),
        selectors.getFieldFieldValidationErrors('host')(state),
        selectors.getFieldFieldValidationErrors('pod')(state),
        selectors.getFieldFieldValidationErrors('tiebreaker')(state),
        selectors.getFieldFieldValidationErrors('timestamp')(state),
      ].every(errors => errors.length === 0),
  };

  return {
    actions,
    initialState: { updates: [] } as State,
    selectors,
  };
});

interface WithSourceConfigurationFormStateProps {
  children: RendererFunction<
    State &
      Actions &
      Selectors & {
        getFieldFieldProps: (field: keyof FormState['fields']) => InputFieldProps;
        getLogAliasFieldProps: () => InputFieldProps;
        getMetricAliasFieldProps: () => InputFieldProps;
        getNameFieldProps: () => InputFieldProps;
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
    {...createContainerProps(initialFormState)}
    context="source-configuration-form"
    onMount={onMount}
  >
    {args => {
      const currentFormState = args.getCurrentFormState();
      return children({
        ...args,
        getNameFieldProps: () =>
          createInputFieldProps({
            errors: args.getNameFieldValidationErrors(),
            name: 'name',
            onChange: args.updateName,
            value: currentFormState.name,
          }),
        getLogAliasFieldProps: () =>
          createInputFieldProps({
            errors: args.getLogAliasFieldValidationErrors(),
            name: 'logAlias',
            onChange: args.updateLogAlias,
            value: currentFormState.logAlias,
          }),
        getMetricAliasFieldProps: () =>
          createInputFieldProps({
            errors: args.getMetricAliasFieldValidationErrors(),
            name: 'metricAlias',
            onChange: args.updateMetricAlias,
            value: currentFormState.metricAlias,
          }),
        getFieldFieldProps: field =>
          createInputFieldProps({
            errors: args.getFieldFieldValidationErrors(field),
            name: `${field}Field`,
            onChange: newValue => args.updateField(field, newValue),
            value: currentFormState.fields[field],
          }),
      });
    }}
  </ConstateContainer>
);

const addOrCombineLastUpdate = (updates: UpdateSourceInput[], newUpdate: UpdateSourceInput) => [
  ...updates.slice(0, -1),
  ...maybeCombineUpdates(updates[updates.length - 1], newUpdate),
];

const createInputFieldProps = <
  Value extends string = string,
  FieldElement extends HTMLInputElement = HTMLInputElement
>({
  errors,
  name,
  onChange,
  value,
}: {
  errors: FieldErrorMessage[];
  name: string;
  onChange: (newValue: string) => void;
  value: Value;
}): InputFieldProps<Value, FieldElement> => ({
  error: errors,
  isInvalid: errors.length > 0,
  name,
  onChange: (evt: React.ChangeEvent<FieldElement>) => onChange(evt.currentTarget.value),
  value,
});

const validateInputFieldNotEmpty = (value: string) =>
  value === ''
    ? [
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.fieldEmptyErrorMessage"
          defaultMessage="The field must not be empty"
        />,
      ]
    : [];

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

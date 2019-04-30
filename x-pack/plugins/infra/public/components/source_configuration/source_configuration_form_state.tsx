/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mergeAll from 'lodash/fp/mergeAll';
import React, { useCallback, useMemo, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { convertChangeToUpdater } from '../../../common/source_configuration';
import { UpdateSourceInput } from '../../graphql/types';

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
    message: string[];
    pod: string;
    tiebreaker: string;
    timestamp: string;
  };
}

export const useSourceConfigurationFormState = ({
  initialFormState,
}: {
  initialFormState: FormState;
}) => {
  const [updates, setUpdates] = useState<UpdateSourceInput[]>([]);

  const addOrCombineLastUpdate = useCallback(
    (newUpdate: UpdateSourceInput) =>
      setUpdates(currentUpdates => [
        ...currentUpdates.slice(0, -1),
        ...maybeCombineUpdates(currentUpdates[currentUpdates.length - 1], newUpdate),
      ]),
    [setUpdates]
  );

  const resetForm = useCallback(() => setUpdates([]), []);

  const formState = useMemo(
    () =>
      updates
        .map(convertChangeToUpdater)
        .reduce((state, updater) => updater(state), initialFormState),
    [updates, initialFormState]
  );

  const nameFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.name),
        name: 'name',
        onChange: name => addOrCombineLastUpdate({ setName: { name } }),
        value: formState.name,
      }),
    [formState.name, addOrCombineLastUpdate]
  );
  const logAliasFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.logAlias),
        name: 'logAlias',
        onChange: logAlias => addOrCombineLastUpdate({ setAliases: { logAlias } }),
        value: formState.logAlias,
      }),
    [formState.logAlias, addOrCombineLastUpdate]
  );
  const metricAliasFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.metricAlias),
        name: 'metricAlias',
        onChange: metricAlias => addOrCombineLastUpdate({ setAliases: { metricAlias } }),
        value: formState.metricAlias,
      }),
    [formState.metricAlias, addOrCombineLastUpdate]
  );
  const containerFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.fields.container),
        name: `containerField`,
        onChange: value => addOrCombineLastUpdate({ setFields: { container: value } }),
        value: formState.fields.container,
      }),
    [formState.fields.container, addOrCombineLastUpdate]
  );
  const hostFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.fields.host),
        name: `hostField`,
        onChange: value => addOrCombineLastUpdate({ setFields: { host: value } }),
        value: formState.fields.host,
      }),
    [formState.fields.host, addOrCombineLastUpdate]
  );
  const podFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.fields.pod),
        name: `podField`,
        onChange: value => addOrCombineLastUpdate({ setFields: { pod: value } }),
        value: formState.fields.pod,
      }),
    [formState.fields.pod, addOrCombineLastUpdate]
  );
  const tiebreakerFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.fields.tiebreaker),
        name: `tiebreakerField`,
        onChange: value => addOrCombineLastUpdate({ setFields: { tiebreaker: value } }),
        value: formState.fields.tiebreaker,
      }),
    [formState.fields.tiebreaker, addOrCombineLastUpdate]
  );
  const timestampFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.fields.timestamp),
        name: `timestampField`,
        onChange: value => addOrCombineLastUpdate({ setFields: { timestamp: value } }),
        value: formState.fields.timestamp,
      }),
    [formState.fields.timestamp, addOrCombineLastUpdate]
  );

  const fieldProps = useMemo(
    () => ({
      name: nameFieldProps,
      logAlias: logAliasFieldProps,
      metricAlias: metricAliasFieldProps,
      containerField: containerFieldFieldProps,
      hostField: hostFieldFieldProps,
      podField: podFieldFieldProps,
      tiebreakerField: tiebreakerFieldFieldProps,
      timestampField: timestampFieldFieldProps,
    }),
    [
      nameFieldProps,
      logAliasFieldProps,
      metricAliasFieldProps,
      containerFieldFieldProps,
      hostFieldFieldProps,
      podFieldFieldProps,
      tiebreakerFieldFieldProps,
      timestampFieldFieldProps,
    ]
  );

  const isFormValid = useMemo(
    () => Object.values(fieldProps).every(({ error }) => error.length <= 0),
    [fieldProps]
  );

  const isFormDirty = useMemo(() => updates.length > 0, [updates]);

  return {
    fieldProps,
    formState,
    isFormDirty,
    isFormValid,
    resetForm,
    updates,
  };
};

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

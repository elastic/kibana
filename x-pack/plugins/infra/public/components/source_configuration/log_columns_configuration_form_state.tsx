/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import {
  LogColumnConfiguration,
  isTimestampLogColumnConfiguration,
  isMessageLogColumnConfiguration,
  TimestampLogColumnConfiguration,
  MessageLogColumnConfiguration,
  FieldLogColumnConfiguration,
} from '../../utils/source_configuration';

export interface TimestampLogColumnConfigurationProps {
  logColumnConfiguration: TimestampLogColumnConfiguration['timestampColumn'];
  remove: () => void;
  type: 'timestamp';
}

export interface MessageLogColumnConfigurationProps {
  logColumnConfiguration: MessageLogColumnConfiguration['messageColumn'];
  remove: () => void;
  type: 'message';
}

export interface FieldLogColumnConfigurationProps {
  logColumnConfiguration: FieldLogColumnConfiguration['fieldColumn'];
  remove: () => void;
  type: 'field';
}

export type LogColumnConfigurationProps =
  | TimestampLogColumnConfigurationProps
  | MessageLogColumnConfigurationProps
  | FieldLogColumnConfigurationProps;

interface FormState {
  logColumns: LogColumnConfiguration[];
}

type FormStateChanges = Partial<FormState>;

export const useLogColumnsConfigurationFormState = ({
  initialFormState = defaultFormState,
}: {
  initialFormState?: FormState;
}) => {
  const [formStateChanges, setFormStateChanges] = useState<FormStateChanges>({});

  const resetForm = useCallback(() => setFormStateChanges({}), []);

  const formState = useMemo(
    () => ({
      ...initialFormState,
      ...formStateChanges,
    }),
    [initialFormState, formStateChanges]
  );

  const logColumnConfigurationProps = useMemo<LogColumnConfigurationProps[]>(
    () =>
      formState.logColumns.map(
        (logColumn): LogColumnConfigurationProps => {
          const remove = () =>
            setFormStateChanges((changes) => ({
              ...changes,
              logColumns: formState.logColumns.filter((item) => item !== logColumn),
            }));

          if (isTimestampLogColumnConfiguration(logColumn)) {
            return {
              logColumnConfiguration: logColumn.timestampColumn,
              remove,
              type: 'timestamp',
            };
          } else if (isMessageLogColumnConfiguration(logColumn)) {
            return {
              logColumnConfiguration: logColumn.messageColumn,
              remove,
              type: 'message',
            };
          } else {
            return {
              logColumnConfiguration: logColumn.fieldColumn,
              remove,
              type: 'field',
            };
          }
        }
      ),
    [formState.logColumns]
  );

  const addLogColumn = useCallback(
    (logColumnConfiguration: LogColumnConfiguration) =>
      setFormStateChanges((changes) => ({
        ...changes,
        logColumns: [...formState.logColumns, logColumnConfiguration],
      })),
    [formState.logColumns]
  );

  const moveLogColumn = useCallback(
    (sourceIndex, destinationIndex) => {
      if (destinationIndex >= 0 && sourceIndex <= formState.logColumns.length - 1) {
        const newLogColumns = [...formState.logColumns];
        newLogColumns.splice(destinationIndex, 0, newLogColumns.splice(sourceIndex, 1)[0]);
        setFormStateChanges((changes) => ({
          ...changes,
          logColumns: newLogColumns,
        }));
      }
    },
    [formState.logColumns]
  );

  const errors = useMemo(
    () =>
      logColumnConfigurationProps.length <= 0
        ? [
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.logColumnListEmptyErrorMessage"
              defaultMessage="The log column list must not be empty."
            />,
          ]
        : [],
    [logColumnConfigurationProps]
  );

  const isFormValid = useMemo(() => (errors.length <= 0 ? true : false), [errors]);

  const isFormDirty = useMemo(() => Object.keys(formStateChanges).length > 0, [formStateChanges]);

  return {
    addLogColumn,
    moveLogColumn,
    errors,
    logColumnConfigurationProps,
    formState,
    formStateChanges,
    isFormDirty,
    isFormValid,
    resetForm,
  };
};

const defaultFormState: FormState = {
  logColumns: [],
};

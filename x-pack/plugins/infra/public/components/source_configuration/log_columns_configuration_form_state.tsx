/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo, useState } from 'react';

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
            setFormStateChanges(changes => ({
              ...changes,
              logColumns: formState.logColumns.filter(item => item !== logColumn),
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
      setFormStateChanges(changes => ({
        ...changes,
        logColumns: [...formState.logColumns, logColumnConfiguration],
      })),
    [formState.logColumns]
  );

  const isFormValid = useMemo(() => (logColumnConfigurationProps.length > 0 ? true : false), [
    logColumnConfigurationProps,
  ]);

  const isFormDirty = useMemo(() => Object.keys(formStateChanges).length > 0, [formStateChanges]);

  return {
    addLogColumn,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { HttpSetup, IToasts } from 'kibana/public';

import { ActionConnector } from '../../../../types';
import { Choice, Fields } from './types';
import { useGetChoices } from './use_get_choices';

export interface UseChoicesProps {
  http: HttpSetup;
  toastNotifications: IToasts;
  actionConnector?: ActionConnector;
  fields: string[];
}

export interface UseChoices {
  choices: Fields;
  isLoading: boolean;
}

export const useChoices = ({
  http,
  actionConnector,
  toastNotifications,
  fields,
}: UseChoicesProps): UseChoices => {
  const defaultFields: Record<string, Choice[]> = useMemo(
    () => fields.reduce((acc, field) => ({ ...acc, [field]: [] }), {}),
    [fields]
  );
  const [choices, setChoices] = useState<Fields>(defaultFields);

  const onChoicesSuccess = useCallback(
    (values: Choice[]) => {
      setChoices(
        values.reduce(
          (acc, value) => ({
            ...acc,
            [value.element]: [...(acc[value.element] ?? []), value],
          }),
          defaultFields
        )
      );
    },
    [defaultFields]
  );

  const { isLoading } = useGetChoices({
    http,
    toastNotifications,
    actionConnector,
    fields,
    onSuccess: onChoicesSuccess,
  });

  return { choices, isLoading };
};

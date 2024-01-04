/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDataSource } from '../../../../contexts/ml';

import { CreateAnalyticsFormProps } from '../../analytics_management/hooks/use_create_analytics_form';

export const useDataViewTimeFields = ({ actions, state }: CreateAnalyticsFormProps) => {
  const { setFormState } = actions;

  const { selectedDataView } = useDataSource();

  const [dataViewAvailableTimeFields, setDataViewAvailableTimeFields] = useState<string[]>([]);

  const onTimeFieldChanged = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      // If the value is an empty string, it's not a valid selection
      if (value === '') {
        return;
      }
      // Find the time field based on the selected value
      // this is to account for undefined when user chooses not to use a date field
      const timeField = dataViewAvailableTimeFields.find((col) => col === value);

      setFormState({ timeFieldName: timeField });
    },
    [dataViewAvailableTimeFields, setFormState]
  );

  useEffect(() => {
    // Default timeFieldName to the source data view's time field if it exists
    if (selectedDataView !== undefined) {
      setFormState({ timeFieldName: selectedDataView.timeFieldName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Get possible timefields for the results data view
    if (selectedDataView !== undefined) {
      const timefields = selectedDataView.fields
        .filter((f) => f.type === 'date')
        .map((f) => f.name);
      setDataViewAvailableTimeFields(timefields);
    }
  }, [selectedDataView, setFormState]);

  return { dataViewAvailableTimeFields, onTimeFieldChanged };
};

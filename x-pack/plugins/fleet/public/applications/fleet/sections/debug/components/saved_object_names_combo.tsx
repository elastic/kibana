/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiComboBox } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useQuery } from '@tanstack/react-query';

import { sendRequest } from '../../../hooks';
import { debugRoutesService } from '../../../../../../common/services';
import { API_VERSIONS } from '../../../../../../common/constants';

const fetchSavedObjectNames = async (type: string) => {
  const response = await sendRequest({
    method: 'post',
    path: debugRoutesService.getSavedObjectNamesPath(),
    body: { type },
    version: API_VERSIONS.internal.v1,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data?.aggregations.names.buckets;
};

interface SavedObjectNamesComboProps {
  name?: string;
  setName: Function;
  type: string;
  setNamesStatus: Function;
}

export const SavedObjectNamesCombo: React.FunctionComponent<SavedObjectNamesComboProps> = ({
  name,
  setName,
  type,
  setNamesStatus,
}) => {
  const { data: savedObjectNames, status } = useQuery(
    ['debug-saved-object-names', type],
    () => fetchSavedObjectNames(type),
    {
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    setNamesStatus(status);
  }, [status, setNamesStatus]);

  const comboBoxOptions = (savedObjectNames ?? []).map((obj: { key: string }) => ({
    label: obj.key,
    value: obj.key,
  }));

  const selectedOption = comboBoxOptions.find(
    (option: { value: string }) => option.value === name
  )!;
  const selectedOptions = selectedOption ? [selectedOption] : [];

  return (
    <EuiComboBox
      prepend="Name"
      aria-label={i18n.translate('xpack.fleet.debug.savedObjectDebugger.selectedSavedObjectLabel', {
        defaultMessage: 'Select a Saved Object',
      })}
      placeholder={i18n.translate(
        'xpack.fleet.debug.savedObjectDebugger.selectedSavedObjectLabel',
        { defaultMessage: 'Select a Saved Object' }
      )}
      fullWidth
      options={comboBoxOptions}
      singleSelection={{ asPlainText: true }}
      selectedOptions={selectedOptions}
      isLoading={status === 'loading'}
      onChange={(newSelectedOptions) => {
        if (!newSelectedOptions.length) {
          setName(undefined);
        } else {
          setName(newSelectedOptions[0].value as string);
        }
      }}
    />
  );
};

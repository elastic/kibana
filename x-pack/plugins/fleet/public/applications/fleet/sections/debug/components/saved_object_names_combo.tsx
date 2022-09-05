/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useImperativeHandle } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EuiComboBox } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { sendRequest } from '../../../hooks';

const fetchSavedObjectNames = async (type: string) => {
  const path = `/.kibana/_search`;
  const body = {
    size: 0,
    query: {
      bool: {
        filter: {
          term: {
            type,
          },
        },
      },
    },
    aggs: {
      names: {
        terms: { field: `${type}.name`, size: 500 },
      },
    },
  };
  const response = await sendRequest({
    method: 'post',
    path: `/api/console/proxy`,
    query: {
      path,
      method: 'GET',
    },
    body,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data?.aggregations.names.buckets;
};

interface SavedObjectNamesComboProps {
  name: string;
  setName: Function;
  type: string;
  setNamesStatus: Function;
}

export const SavedObjectNamesCombo = forwardRef(
  ({ name, setName, type, setNamesStatus }: SavedObjectNamesComboProps, ref) => {
    const {
      data: savedObjectNames,
      refetch,
      status,
    } = useQuery(['debug-saved-object-names', type], () => fetchSavedObjectNames(type), {
      refetchOnWindowFocus: false,
    });

    setNamesStatus?.(status);

    useImperativeHandle(ref, () => ({
      refetchNames: refetch,
    }));

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
        aria-label={i18n.translate(
          'xpack.fleet.debug.savedObjectDebugger.selectedSavedObjectLabel',
          { defaultMessage: 'Select a Saved Object' }
        )}
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
  }
);

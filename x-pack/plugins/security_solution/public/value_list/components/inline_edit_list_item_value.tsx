/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiInlineEditText } from '@elastic/eui';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { usePatchListItemMutation } from '@kbn/securitysolution-list-hooks';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { EDIT_TEXT_INLINE_LABEL, SUCCESFULLY_UPDATED_LIST_ITEM } from '../translations';

const toastOptions = {
  toastLifeTimeMs: 5000,
};

export const InlineEditListItemValue = ({ listItem }: { listItem: ListItemSchema }) => {
  const [value, setValue] = useState(listItem.value);
  const { addSuccess, addError } = useAppToasts();
  const http = useKibana().services.http;
  const patchListItemMutation = usePatchListItemMutation({
    onSuccess: () => {
      addSuccess(SUCCESFULLY_UPDATED_LIST_ITEM, toastOptions);
    },
    onError: (error) => {
      addError(error, {
        title: error.message,
        toastMessage: error?.body?.message ?? error.message,
      });
    },
  });
  const onChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);
  const onCancel = useCallback(() => {
    setValue(listItem.value);
  }, [listItem]);

  const onSave = useCallback(
    async (newValue) => {
      await patchListItemMutation.mutateAsync({
        id: listItem.id,
        value: newValue,
        _version: listItem._version,
        http,
      });
      return true;
    },
    [listItem._version, listItem.id, patchListItemMutation, http]
  );

  return (
    <EuiInlineEditText
      data-test-subj={`value-list-item-update-${listItem.value}`}
      size={'s'}
      inputAriaLabel={EDIT_TEXT_INLINE_LABEL}
      value={value}
      onChange={onChange}
      onSave={onSave}
      onCancel={onCancel}
      isLoading={patchListItemMutation.isLoading}
    />
  );
};

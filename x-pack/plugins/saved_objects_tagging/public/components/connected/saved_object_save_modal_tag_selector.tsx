/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedObjectSaveModalTagSelectorComponentProps } from '../../../../../../src/plugins/saved_objects_tagging_oss/public';
import { TagSelector } from '../base';
import { ITagsCache } from '../../tags';

export const getConnectedSavedObjectModalTagSelectorComponent = (
  cache: ITagsCache
): FC<SavedObjectSaveModalTagSelectorComponentProps> => {
  return ({
    initialSelection,
    setSelected: notifySelectionChange,
  }: SavedObjectSaveModalTagSelectorComponentProps) => {
    const tags = useObservable(cache.getState$(), []);
    const [selected, setSelected] = useState<string[]>(initialSelection);

    const setSelectedInternal = useCallback(
      (newSelection: string[]) => {
        setSelected(newSelection);
        notifySelectionChange(newSelection);
      },
      [notifySelectionChange]
    );

    return (
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.savedObjectsTagging.uiApi.saveModal.label"
            defaultMessage="Tags"
          />
        }
      >
        <TagSelector selected={selected} setSelected={setSelectedInternal} tags={tags} />
      </EuiFormRow>
    );
  };
};

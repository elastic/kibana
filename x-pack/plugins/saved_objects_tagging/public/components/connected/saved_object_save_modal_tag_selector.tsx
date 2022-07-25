/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectSaveModalTagSelectorComponentProps } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { TagsCapabilities } from '../../../common';
import { TagSelector } from '../base';
import { ITagsCache } from '../../services';
import { CreateModalOpener } from '../edition_modal';

interface GetConnectedTagSelectorOptions {
  cache: ITagsCache;
  capabilities: TagsCapabilities;
  openCreateModal: CreateModalOpener;
}

export const getConnectedSavedObjectModalTagSelectorComponent = ({
  cache,
  capabilities,
  openCreateModal,
}: GetConnectedTagSelectorOptions): FC<SavedObjectSaveModalTagSelectorComponentProps> => {
  return ({
    initialSelection,
    onTagsSelected: notifySelectionChange,
  }: SavedObjectSaveModalTagSelectorComponentProps) => {
    const tags = useObservable(cache.getState$(), cache.getState());
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
        <TagSelector
          selected={selected}
          onTagsSelected={setSelectedInternal}
          tags={tags}
          data-test-subj="savedObjectTagSelector"
          allowCreate={capabilities.create}
          openCreateModal={openCreateModal}
        />
      </EuiFormRow>
    );
  };
};

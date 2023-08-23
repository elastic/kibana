/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SavedObjectSaveModal } from '@kbn/saved-objects-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const SaveSearchObjectModal: React.FC<{
  isTimeBased: boolean;
  savedObjectsTagging: SavedObjectsTaggingApi;
  title: string;
  showCopyOnSave: boolean;
  description?: string;
  timeRestore?: boolean;
  tags: string[];
  onSave: (props: OnSaveProps & { newTimeRestore: boolean; newTags: string[] }) => void;
  onClose: () => void;
}> = ({
  isTimeBased,
  savedObjectsTagging,
  title,
  description,
  tags,
  showCopyOnSave,
  timeRestore: savedTimeRestore,
  onSave,
  onClose,
}) => {
  const [timeRestore, setTimeRestore] = useState<boolean>(
    (isTimeBased && savedTimeRestore) || false
  );
  const [currentTags, setCurrentTags] = useState(tags);

  const onModalSave = (params: OnSaveProps) => {
    onSave({
      ...params,
      newTimeRestore: timeRestore,
      newTags: currentTags,
    });
  };

  const tagSelector = savedObjectsTagging ? (
    <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
      initialSelection={currentTags}
      onTagsSelected={(newTags) => {
        setCurrentTags(newTags);
      }}
    />
  ) : undefined;

  const timeSwitch = isTimeBased ? (
    <EuiFormRow
      helpText={
        <FormattedMessage
          id="discover.topNav.saveModal.storeTimeWithSearchToggleDescription"
          defaultMessage="Update the time filter and refresh interval to the current selection when using this search."
        />
      }
    >
      <EuiSwitch
        data-test-subj="storeTimeWithSearch"
        checked={timeRestore}
        onChange={(event) => setTimeRestore(event.target.checked)}
        label={
          <FormattedMessage
            id="discover.topNav.saveModal.storeTimeWithSearchToggleLabel"
            defaultMessage="Store time with saved search"
          />
        }
      />
    </EuiFormRow>
  ) : null;

  const options = tagSelector ? (
    <>
      {tagSelector}
      {timeSwitch}
    </>
  ) : (
    timeSwitch
  );

  return (
    <SavedObjectSaveModal
      title={title}
      showCopyOnSave={showCopyOnSave}
      description={description}
      objectType={'search'}
      showDescription={true}
      options={options}
      onSave={onModalSave}
      onClose={onClose}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useMemo, useCallback } from 'react';
import {
  OriginSaveModalProps,
  SavedObjectSaveModalOrigin,
  OnSaveProps,
  SaveModalState,
} from '@kbn/saved-objects-plugin/public';
import { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';

export type OriginSaveProps = OnSaveProps & { returnToOrigin: boolean; newTags?: string[] };

export type TagEnhancedSavedObjectSaveModalOriginProps = Omit<OriginSaveModalProps, 'onSave'> & {
  initialTags: string[];
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  onSave: (props: OriginSaveProps) => void;
};

export const TagEnhancedSavedObjectSaveModalOrigin: FC<
  TagEnhancedSavedObjectSaveModalOriginProps
> = ({ initialTags, onSave, savedObjectsTagging, options, ...otherProps }) => {
  const [selectedTags, setSelectedTags] = useState(initialTags);

  const tagSelectorOption = useMemo(
    () =>
      savedObjectsTagging ? (
        <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
          initialSelection={initialTags}
          onTagsSelected={setSelectedTags}
        />
      ) : undefined,
    [savedObjectsTagging, initialTags]
  );

  const tagEnhancedOptions =
    typeof options === 'function' ? (
      (state: SaveModalState) => {
        return (
          <>
            {tagSelectorOption}
            {options(state)}
          </>
        );
      }
    ) : (
      <>
        {tagSelectorOption}
        {options}
      </>
    );

  const tagEnhancedOnSave: OriginSaveModalProps['onSave'] = useCallback(
    (saveOptions) => {
      onSave({
        ...saveOptions,
        newTags: selectedTags,
      });
    },
    [onSave, selectedTags]
  );

  return (
    <SavedObjectSaveModalOrigin
      {...otherProps}
      onSave={tagEnhancedOnSave}
      options={tagEnhancedOptions}
    />
  );
};

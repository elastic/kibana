/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useMemo, useCallback } from 'react';
import { OnSaveProps } from '../../../../../src/plugins/saved_objects/public';
import {
  SaveModalDashboardProps,
  SavedObjectSaveModalDashboard,
} from '../../../../../src/plugins/presentation_util/public';
import { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public';

export type DashboardSaveProps = OnSaveProps & {
  returnToOrigin: boolean;
  dashboardId?: string | null;
  newTags?: string[];
};

export type TagEnhancedSavedObjectSaveModalDashboardProps = Omit<
  SaveModalDashboardProps,
  'onSave'
> & {
  initialTags: string[];
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  onSave: (props: DashboardSaveProps) => void;
};

export const TagEnhancedSavedObjectSaveModalDashboard: FC<TagEnhancedSavedObjectSaveModalDashboardProps> = ({
  initialTags,
  onSave,
  savedObjectsTagging,
  ...otherProps
}) => {
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

  const tagEnhancedOptions = <>{tagSelectorOption}</>;

  const tagEnhancedOnSave: SaveModalDashboardProps['onSave'] = useCallback(
    (saveOptions) => {
      onSave({
        ...saveOptions,
        returnToOrigin: false,
        newTags: selectedTags,
      });
    },
    [onSave, selectedTags]
  );

  return (
    <SavedObjectSaveModalDashboard
      {...otherProps}
      onSave={tagEnhancedOnSave}
      tagOptions={tagEnhancedOptions}
    />
  );
};

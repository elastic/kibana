/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiPopoverTitle, EuiSelectable, EuiButton } from '@elastic/eui';
import type { TimelineItem } from '@kbn/timelines-plugin/common'; // TODO: maybe not the correct import place as this will be deleted?
import React, { useCallback, useMemo, useState } from 'react';
import { TAGS } from '@kbn/rule-data-utils';
import { intersection, union } from 'lodash';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import { getUpdateAlertsQuery } from '../../../../detections/components/alerts_table/actions';
import { DEFAULT_ALERT_TAGS_KEY } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../lib/kibana';
import { useSetAlertTags } from './use_set_alert_tags';
import { useAppToasts } from '../../../hooks/use_app_toasts';

interface BulkAlertTagsPanelComponentProps {
  alertIds: TimelineItem[];
  refetchQuery: () => void;
  setIsLoading: (isLoading: boolean) => void;
  refresh?: () => void;
  clearSelection?: () => void;
  closePopoverMenu: () => void;
}
export const BulkAlertTagsPanelComponent: React.FC<BulkAlertTagsPanelComponentProps> = ({
  alertIds,
  refresh,
  refetchQuery,
  setIsLoading,
  clearSelection,
  closePopoverMenu,
}) => {
  const [alertTagOptions] = useUiSetting$<string[]>(DEFAULT_ALERT_TAGS_KEY);
  const { addSuccess, addError, addWarning } = useAppToasts();

  const { setAlertTags } = useSetAlertTags();
  const initalTagsState = useMemo(() => {
    const existingTags = alertIds.map(
      (item) => item.data.find((data) => data.field === TAGS)?.value ?? []
    );
    const existingTagsIntersection = intersection(...existingTags);
    const existingTagsUnion = union(...existingTags);
    const allTagsUnion = union(existingTagsUnion, alertTagOptions);
    return allTagsUnion
      .map((tag): EuiSelectableOption => {
        return {
          label: tag,
          checked: existingTagsIntersection.includes(tag)
            ? 'on'
            : existingTagsUnion.includes(tag)
            ? 'off'
            : undefined,
        };
      })
      .sort((a, b) => (a.checked ? a.checked < b.checked : true));
  }, [alertIds, alertTagOptions]);
  const tagsToAdd: Record<string, boolean> = useMemo(() => ({}), []);
  const tagsToRemove: Record<string, boolean> = useMemo(() => ({}), []);

  const onUpdateSuccess = useCallback(
    (updated: number, conflicts: number) => {
      if (conflicts > 0) {
        addWarning({
          title: 'Warning',
          text: `${updated} alerts updated successfully, but ${conflicts} didn't due to version conflicts`,
        });
      } else {
        addSuccess(`${updated} alerts successfully updated`);
      }
    },
    [addSuccess, addWarning]
  );

  const onUpdateFailure = useCallback(
    (error: Error) => {
      addError(error.message, { title: 'Tags failed to update' });
    },
    [addError]
  );

  const [selectableAlertTags, setSelectableAlertTags] =
    useState<EuiSelectableOption[]>(initalTagsState);

  const onTagsUpdate = useCallback(async () => {
    closePopoverMenu();
    const ids = alertIds.map((item) => item._id);
    const query: Record<string, unknown> = getUpdateAlertsQuery(ids).query;
    const tagsToAddArray = Object.keys(tagsToAdd);
    const tagsToRemoveArray = Object.keys(tagsToRemove);
    try {
      setIsLoading(true);

      const response = await setAlertTags({
        tags: { tags_to_add: tagsToAddArray, tags_to_remove: tagsToRemoveArray },
        query,
      });

      setIsLoading(false);
      refetchQuery();
      if (refresh) refresh();
      if (clearSelection) clearSelection();

      if (response.version_conflicts && ids.length === 1) {
        throw new Error('Updated failed due to version conflicts');
      }

      onUpdateSuccess(response.updated ?? 0, response.version_conflicts ?? 0);
    } catch (err) {
      onUpdateFailure(err);
    }
  }, [
    closePopoverMenu,
    alertIds,
    tagsToAdd,
    tagsToRemove,
    setIsLoading,
    setAlertTags,
    refetchQuery,
    refresh,
    clearSelection,
    onUpdateSuccess,
    onUpdateFailure,
  ]);

  const handleTagsOnChange = (
    newOptions: EuiSelectableOption[],
    event: EuiSelectableOnChangeEvent,
    changedOption: EuiSelectableOption
  ) => {
    if (changedOption.checked === 'off') {
      // Don't allow intermediate state when selecting, only from initial state
      newOptions[newOptions.findIndex((option) => option.label === changedOption.label)] = {
        ...changedOption,
        checked: undefined,
      };
      tagsToRemove[changedOption.label] = true;
      delete tagsToAdd[changedOption.label];
    } else if (changedOption.checked === 'on') {
      tagsToAdd[changedOption.label] = true;
      delete tagsToRemove[changedOption.label];
    } else if (!changedOption.checked) {
      tagsToRemove[changedOption.label] = true;
      delete tagsToAdd[changedOption.label];
    }
    setSelectableAlertTags(newOptions);
  };

  return (
    <>
      <EuiSelectable
        allowExclusions
        searchable
        searchProps={{
          placeholder: 'Search tags',
        }}
        aria-label={'search them tags'}
        options={selectableAlertTags}
        onChange={handleTagsOnChange}
        emptyMessage={'im empty fill me up'}
        noMatchesMessage={'no matches here you absolute fool'}
      >
        {(list, search) => (
          <div>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
      <EuiButton fullWidth size="s" onClick={onTagsUpdate}>
        {'Update tags'}
      </EuiButton>
    </>
  );
};

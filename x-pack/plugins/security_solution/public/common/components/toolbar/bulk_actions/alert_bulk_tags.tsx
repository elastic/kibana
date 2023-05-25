/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiPopoverTitle, EuiSelectable, EuiButton } from '@elastic/eui';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { TAGS } from '@kbn/rule-data-utils';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import { getUpdateAlertsQuery } from '../../../../detections/components/alerts_table/actions';
import { DEFAULT_ALERT_TAGS_KEY } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../lib/kibana';
import { useSetAlertTags } from './use_set_alert_tags';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import * as i18n from './translations';
import { createInitialTagsState } from './helpers';

interface BulkAlertTagsPanelComponentProps {
  alertItems: TimelineItem[];
  refetchQuery?: () => void;
  setIsLoading: (isLoading: boolean) => void;
  refresh?: () => void;
  clearSelection?: () => void;
  closePopoverMenu: () => void;
}
const BulkAlertTagsPanelComponent: React.FC<BulkAlertTagsPanelComponentProps> = ({
  alertItems,
  refresh,
  refetchQuery,
  setIsLoading,
  clearSelection,
  closePopoverMenu,
}) => {
  const [defaultAlertTagOptions] = useUiSetting$<string[]>(DEFAULT_ALERT_TAGS_KEY);
  const { addSuccess, addError, addWarning } = useAppToasts();

  const { setAlertTags } = useSetAlertTags();
  const existingTags = useMemo(
    () => alertItems.map((item) => item.data.find((data) => data.field === TAGS)?.value ?? []),
    [alertItems]
  );
  const initalTagsState = useMemo(
    () => createInitialTagsState(existingTags, defaultAlertTagOptions),
    [existingTags, defaultAlertTagOptions]
  );

  const tagsToAdd: Record<string, boolean> = useMemo(() => ({}), []);
  const tagsToRemove: Record<string, boolean> = useMemo(() => ({}), []);

  const onUpdateSuccess = useCallback(
    (updated: number, conflicts: number) => {
      if (conflicts > 0) {
        addWarning({
          title: i18n.UPDATE_ALERT_TAGS_FAILED(conflicts),
          text: i18n.UPDATE_ALERT_TAGS_FAILED_DETAILED(updated, conflicts),
        });
      } else {
        addSuccess(i18n.UPDATE_ALERT_TAGS_SUCCESS_TOAST(updated));
      }
    },
    [addSuccess, addWarning]
  );

  const onUpdateFailure = useCallback(
    (error: Error) => {
      addError(error.message, { title: i18n.UPDATE_ALERT_TAGS_FAILURE });
    },
    [addError]
  );

  const [selectableAlertTags, setSelectableAlertTags] =
    useState<EuiSelectableOption[]>(initalTagsState);

  const onTagsUpdate = useCallback(async () => {
    closePopoverMenu();
    const ids = alertItems.map((item) => item._id);
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
      if (refetchQuery) refetchQuery();
      if (refresh) refresh();
      if (clearSelection) clearSelection();

      if (response.version_conflicts && ids.length === 1) {
        throw new Error(i18n.BULK_ACTION_FAILED_SINGLE_ALERT);
      }

      onUpdateSuccess(response.updated ?? 0, response.version_conflicts ?? 0);
    } catch (err) {
      onUpdateFailure(err);
    }
  }, [
    closePopoverMenu,
    alertItems,
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
          placeholder: i18n.ALERT_TAGS_MENU_SEARCH_PLACEHOLDER,
        }}
        aria-label={i18n.ALERT_TAGS_MENU_SEARCH_PLACEHOLDER}
        options={selectableAlertTags}
        onChange={handleTagsOnChange}
        emptyMessage={i18n.ALERT_TAGS_MENU_EMPTY}
        noMatchesMessage={i18n.ALERT_TAGS_MENU_SEARCH_NO_TAGS_FOUND}
      >
        {(list, search) => (
          <div>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
      <EuiButton fullWidth size="s" onClick={onTagsUpdate}>
        {i18n.ALERT_TAGS_UPDATE_BUTTON_MESSAGE}
      </EuiButton>
    </>
  );
};

export const BulkAlertTagsPanel = memo(BulkAlertTagsPanelComponent);

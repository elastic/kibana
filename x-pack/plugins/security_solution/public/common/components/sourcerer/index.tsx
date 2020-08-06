/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { useManageSource } from '../../containers/source';
import * as i18n from './translations';
export const Sourcerer = React.memo(() => {
  const {
    getActiveSourceGroupId,
    getAvailableIndexPatterns,
    getManageSourceById,
    updateIndicies,
    isIndexPatternsLoading,
  } = useManageSource();

  const activeSourceGroupId = useMemo(() => getActiveSourceGroupId(), [getActiveSourceGroupId]);

  const { indexPatterns: selectedOptions, loading: loadingIndices } = useMemo(
    () => getManageSourceById(activeSourceGroupId),
    [getManageSourceById, activeSourceGroupId]
  );

  const onChangeIndexPattern = useCallback(
    (newIndexPatterns: string[]) => {
      updateIndicies(activeSourceGroupId, newIndexPatterns);
    },
    [activeSourceGroupId, updateIndicies]
  );

  const loading = useMemo(() => loadingIndices || isIndexPatternsLoading, [
    isIndexPatternsLoading,
    loadingIndices,
  ]);

  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const trigger = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={i18n.SOURCERER}
        flush="left"
        iconSide="right"
        iconType="indexSettings"
        onClick={() => setPopoverIsOpen(!isPopoverOpen)}
        size="l"
        title={i18n.SOURCERER}
      >
        {i18n.SOURCERER}
      </EuiButtonEmpty>
    ),
    [isPopoverOpen]
  );
  const options: EuiSelectableOption[] = useMemo(
    () =>
      getAvailableIndexPatterns().map((title, id) => ({
        label: title,
        key: `${title}-${id}`,
        value: title,
        checked: selectedOptions && selectedOptions.includes(title) ? 'on' : undefined,
      })),
    [getAvailableIndexPatterns, selectedOptions]
  );

  const onChange = useCallback(
    (choices: EuiSelectableOption[]) => {
      const choice = choices.reduce<string[]>(
        (acc, { checked, label }) => (checked === 'on' ? [...acc, label] : acc),
        []
      );
      onChangeIndexPattern(choice);
    },
    [onChangeIndexPattern]
  );
  return (
    <EuiPopover
      button={trigger}
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverIsOpen(false)}
      display="block"
      panelPaddingSize="s"
      ownFocus
    >
      <div style={{ width: 320 }}>
        <EuiPopoverTitle>{i18n.CHANGE_INDEX_PATTERNS}</EuiPopoverTitle>
        <EuiSelectable
          data-test-subj="indexPattern-switcher"
          searchable
          isLoading={loading}
          options={options}
          onChange={onChange}
          searchProps={{
            compressed: true,
          }}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
});
Sourcerer.displayName = 'Sourcerer';

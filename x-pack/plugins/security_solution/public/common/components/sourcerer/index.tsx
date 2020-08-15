/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHighlight,
  EuiIconTip,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { useManageSource } from '../../containers/sourcerer';
import * as i18n from './translations';
import { SOURCERER_FEATURE_FLAG_ON } from '../../containers/sourcerer/constants';
import { ADD_INDEX_PATH } from '../../../../common/constants';

export const MaybeSourcerer = React.memo(() => {
  const {
    activeSourceGroupId,
    availableIndexPatterns,
    getManageSourceGroupById,
    isIndexPatternsLoading,
    updateSourceGroupIndicies,
  } = useManageSource();
  const { defaultPatterns, indexPatterns: selectedOptions, loading: loadingIndices } = useMemo(
    () => getManageSourceGroupById(activeSourceGroupId),
    [getManageSourceGroupById, activeSourceGroupId]
  );

  const loading = useMemo(() => loadingIndices || isIndexPatternsLoading, [
    isIndexPatternsLoading,
    loadingIndices,
  ]);

  const onChangeIndexPattern = useCallback(
    (newIndexPatterns: string[]) => {
      updateSourceGroupIndicies(activeSourceGroupId, newIndexPatterns);
    },
    [activeSourceGroupId, updateSourceGroupIndicies]
  );

  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const setPopoverIsOpenCb = useCallback(() => setPopoverIsOpen((prevState) => !prevState), []);
  const trigger = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={i18n.SOURCERER}
        data-test-subj="sourcerer-trigger"
        flush="left"
        iconSide="right"
        iconType="indexSettings"
        onClick={setPopoverIsOpenCb}
        size="l"
        title={i18n.SOURCERER}
      >
        {i18n.SOURCERER}
      </EuiButtonEmpty>
    ),
    [setPopoverIsOpenCb]
  );
  const options: EuiSelectableOption[] = useMemo(
    () =>
      availableIndexPatterns.map((title, id) => ({
        label: title,
        key: `${title}-${id}`,
        value: title,
        checked: selectedOptions.includes(title) ? 'on' : undefined,
      })),
    [availableIndexPatterns, selectedOptions]
  );
  const unSelectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      defaultPatterns
        .filter((title) => !availableIndexPatterns.includes(title))
        .map((title, id) => ({
          label: title,
          key: `${title}-${id}`,
          value: title,
          disabled: true,
          checked: undefined,
        })),
    [availableIndexPatterns, defaultPatterns]
  );
  const renderOption = useCallback(
    (option, searchValue) => (
      <>
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        {option.disabled ? (
          <EuiIconTip position="top" content={i18n.DISABLED_INDEX_PATTERNS} />
        ) : null}
      </>
    ),
    []
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
  const allOptions = useMemo(() => [...options, ...unSelectableOptions], [
    options,
    unSelectableOptions,
  ]);
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
        <EuiPopoverTitle>
          <>
            {i18n.CHANGE_INDEX_PATTERNS}
            <EuiIconTip position="right" content={i18n.CONFIGURE_INDEX_PATTERNS} />
          </>
        </EuiPopoverTitle>
        <EuiSelectable
          data-test-subj="indexPattern-switcher"
          searchable
          isLoading={loading}
          options={allOptions}
          onChange={onChange}
          renderOption={renderOption}
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
        <EuiPopoverFooter>
          <EuiButton data-test-subj="add-index" href={ADD_INDEX_PATH} fullWidth size="s">
            {i18n.ADD_INDEX_PATTERNS}
          </EuiButton>
        </EuiPopoverFooter>
      </div>
    </EuiPopover>
  );
});
MaybeSourcerer.displayName = 'Sourcerer';

export const Sourcerer = SOURCERER_FEATURE_FLAG_ON ? MaybeSourcerer : () => null;

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
import {
  EuiSelectableOption,
  EuiSelectableOptionCheckedType,
} from '@elastic/eui/src/components/selectable/selectable_option';
import { useSourcererContext } from '../../containers/sourcerer';
import * as i18n from './translations';
import { SOURCERER_FEATURE_FLAG_ON } from '../../containers/sourcerer/constants';
import { ADD_INDEX_PATH } from '../../../../common/constants';
const ON: EuiSelectableOptionCheckedType = 'on';
export const MaybeSourcerer = React.memo(() => {
  const {
    activeSourcererScopeId,
    kibanaIndexPatterns,
    getSourcererScopeById,
    isIndexPatternsLoading,
    updateSourcererScopeIndices,
  } = useSourcererContext();
  const {
    scopePatterns,
    selectedPatterns: selectedOptions,
    loading: loadingIndices,
  } = useMemo(() => getSourcererScopeById(activeSourcererScopeId), [
    getSourcererScopeById,
    activeSourcererScopeId,
  ]);

  const loading = useMemo(() => loadingIndices || isIndexPatternsLoading, [
    isIndexPatternsLoading,
    loadingIndices,
  ]);

  const onChangeIndexPattern = useCallback(
    (selectedPatterns: string[]) => {
      updateSourcererScopeIndices({
        id: activeSourcererScopeId,
        selectedPatterns,
      });
    },
    [activeSourcererScopeId, updateSourcererScopeIndices]
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
      loading
        ? []
        : [
            ...scopePatterns.map((title, id) => ({
              label: title,
              key: `${title}-${id}`,
              value: title,
              checked: selectedOptions.includes(title) ? ON : undefined,
            })),
            ...kibanaIndexPatterns
              .filter((title) => !scopePatterns.includes(title))
              .map((title, id) => ({
                label: title,
                key: `${title}-${id}`,
                value: title,
                checked: selectedOptions.includes(title) ? ON : undefined,
              })),
          ],
    [kibanaIndexPatterns, loading, scopePatterns, selectedOptions]
  );
  // TO DO check if index pattern has results and if it does not, make it unselectable
  // const unSelectableOptions: EuiSelectableOption[] = useMemo(
  //   () =>
  //     []
  //       .filter((title) => !kibanaIndexPatterns.includes(title))
  //       .map((title, id) => ({
  //         label: title,
  //         key: `${title}-${id}`,
  //         value: title,
  //         disabled: true,
  //         checked: undefined,
  //       })),
  //   [kibanaIndexPatterns]
  // );
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
          options={options}
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

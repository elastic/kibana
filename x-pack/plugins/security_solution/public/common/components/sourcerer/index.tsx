/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
import deepEqual from 'fast-deep-equal';
import debounce from 'lodash/debounce';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  EuiSelectableOption,
  EuiSelectableOptionCheckedType,
} from '@elastic/eui/src/components/selectable/selectable_option';
import * as i18n from './translations';
import { SOURCERER_FEATURE_FLAG_ON } from '../../containers/sourcerer/constants';
import { ADD_INDEX_PATH } from '../../../../common/constants';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import { State } from '../../store';
import { getSourcererScopeSelector, SourcererScopeSelector } from './selectors';

const ON: EuiSelectableOptionCheckedType = 'on';

interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}

export const SourcererComponent = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { allExistingIndexPatterns, sourcererScope } = useSelector<State, SourcererScopeSelector>(
    (state) => sourcererScopeSelector(state, scopeId),
    deepEqual
  );

  const { selectedPatterns: selectedOptions, loading } = sourcererScope;

  const onChangeIndexPattern = useCallback(
    (selectedPatterns: string[]) => {
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns,
        })
      );
    },
    [dispatch, scopeId]
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
            ...allExistingIndexPatterns.sort().map((title, id) => ({
              label: title,
              key: `${title}-${id}`,
              value: title,
              checked: selectedOptions.includes(title) ? ON : undefined,
            })),
          ],
    [allExistingIndexPatterns, loading, selectedOptions]
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
          onChange={debounce(onChange, 300, {
            leading: true,
            trailing: false,
          })}
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
SourcererComponent.displayName = 'Sourcerer';

export const Sourcerer = SOURCERER_FEATURE_FLAG_ON ? SourcererComponent : () => null;

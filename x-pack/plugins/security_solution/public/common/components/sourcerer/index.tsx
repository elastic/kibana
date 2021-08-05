/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiSuperSelect,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import * as i18n from './translations';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import { State } from '../../store';
import { getSourcererScopeSelector, SourcererScopeSelector } from './selectors';

const PopoverContent = styled.div`
  width: 600px;
`;

const ResetButton = styled(EuiButtonEmpty)`
  width: fit-content;
`;
interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}

export const Sourcerer = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { defaultIndexPattern, kibanaIndexPatterns, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, scopeId), deepEqual);
  const { selectedKipId, loading } = sourcererScope;
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  // const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
  //   selectedPatterns.map((indexSelected) => ({
  //     label: indexSelected,
  //     value: indexSelected,
  //   }))
  // );
  const selectedPatterns = useMemo(() => {
    const theKip = kibanaIndexPatterns.find((kip) => kip.id === selectedKipId);
    console.log('ayo', { theKip, kibanaIndexPatterns, selectedKipId });
    return theKip != null ? theKip.title : '';
  }, [kibanaIndexPatterns, selectedKipId]);
  const [selectedOption, setSelectedOption] = useState<string>(selectedKipId ?? '');
  // const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);

  const setPopoverIsOpenCb = useCallback(() => setPopoverIsOpen((prevState) => !prevState), []);
  const onChangeKip = useCallback(
    (newSelectedKip: string) => {
      dispatch(
        sourcererActions.setSelectedKip({
          id: scopeId,
          selectedKipId: newSelectedKip,
        })
      );
    },
    [dispatch, scopeId]
  );
  // const onChangeIndexPattern = useCallback(
  //   (newSelectedPatterns: string[]) => {
  //     dispatch(
  //       sourcererActions.setSelectedIndexPatterns({
  //         id: scopeId,
  //         selectedPatterns: newSelectedPatterns,
  //       })
  //     );
  //   },
  //   [dispatch, scopeId]
  // );

  // const renderOption = useCallback(
  //   ({ value }) =>
  //     kibanaIndexPatterns.some((kip) => kip.title === value) ? (
  //       <span data-test-subj="kip-option">
  //         <EuiIcon type="logoKibana" size="s" /> {value}
  //       </span>
  //     ) : (
  //       <span data-test-subj="config-option">{value}</span>
  //     ),
  //   [kibanaIndexPatterns]
  // );
  //
  // const onChangeCombo = useCallback((newSelectedOptions) => {
  //   setSelectedOptions(newSelectedOptions);
  // }, []);

  const onChangeSuper = useCallback((newSelectedOption) => {
    setSelectedOption(newSelectedOption);
  }, []);

  const resetDataSources = useCallback(() => {
    setSelectedOption(defaultIndexPattern.id);
    // setSelectedOptions(
    //   getPatternList(defaultIndexPattern).map((indexSelected: string) => ({
    //     label: indexSelected,
    //     value: indexSelected,
    //   }))
    // );
  }, [defaultIndexPattern]);

  const handleSaveIndices = useCallback(() => {
    // onChangeIndexPattern(selectedOptions.map((so) => so.label));
    onChangeKip(selectedOption);
    setPopoverIsOpen(false);
  }, [onChangeKip, selectedOption]);

  const handleClosePopOver = useCallback(() => {
    setPopoverIsOpen(false);
  }, []);

  // const indexesPatternOptions = useMemo(
  //   () => kibanaIndexPatterns.map(({ title: index }) => ({ label: index, value: index })),
  //   [kibanaIndexPatterns]
  // );
  const trigger = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={i18n.SOURCERER}
        data-test-subj="sourcerer-trigger"
        flush="left"
        iconSide="right"
        iconType="arrowDown"
        isLoading={loading}
        onClick={setPopoverIsOpenCb}
        title={i18n.SOURCERER}
      >
        {i18n.SOURCERER}
      </EuiButtonEmpty>
    ),
    [setPopoverIsOpenCb, loading]
  );

  const indexesPatternSelectOptions = useMemo(
    () =>
      kibanaIndexPatterns.map(({ title, id }) => ({
        inputDisplay: (
          <span data-test-subj="kip-option-super">
            <EuiIcon type="logoKibana" size="s" /> {title}
          </span>
        ),
        value: id,
      })),
    [kibanaIndexPatterns]
  );
  // const comboBox = useMemo(
  //   () => (
  //     <EuiComboBox
  //       data-test-subj="indexPattern-switcher"
  //       placeholder={i18n.PICK_INDEX_PATTERNS}
  //       fullWidth
  //       options={indexesPatternOptions}
  //       selectedOptions={selectedOptions}
  //       onChange={onChangeCombo}
  //       renderOption={renderOption}
  //     />
  //   ),
  //   [indexesPatternOptions, onChangeCombo, renderOption, selectedOptions]
  // );
  const superSelect = useMemo(
    () => (
      <EuiSuperSelect
        data-test-subj="indexPattern-switcher"
        placeholder={i18n.PICK_INDEX_PATTERNS}
        fullWidth
        options={indexesPatternSelectOptions}
        valueOfSelected={selectedOption}
        onChange={onChangeSuper}
      />
    ),
    [indexesPatternSelectOptions, onChangeSuper, selectedOption]
  );

  useEffect(() => {
    setSelectedOption((prevSelectedOption) =>
      !deepEqual(selectedKipId, prevSelectedOption) ? selectedKipId : prevSelectedOption
    );
  }, [selectedKipId]);

  const tooltipContent = useMemo(() => (isPopoverOpen ? null : selectedPatterns), [
    isPopoverOpen,
    selectedPatterns,
  ]);

  return (
    <EuiToolTip position="top" content={tooltipContent}>
      <EuiPopover
        data-test-subj="sourcerer-popover"
        button={trigger}
        isOpen={isPopoverOpen}
        closePopover={handleClosePopOver}
        display="block"
        panelPaddingSize="s"
        repositionOnScroll
        ownFocus
      >
        <PopoverContent>
          <EuiPopoverTitle>
            <>{i18n.SELECT_INDEX_PATTERNS}</>
          </EuiPopoverTitle>
          <EuiSpacer size="s" />
          <EuiText color="default">{i18n.INDEX_PATTERNS_SELECTION_LABEL}</EuiText>
          <EuiSpacer size="xs" />
          {superSelect}
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <ResetButton
                aria-label={i18n.INDEX_PATTERNS_RESET}
                data-test-subj="sourcerer-reset"
                flush="left"
                onClick={resetDataSources}
                title={i18n.INDEX_PATTERNS_RESET}
              >
                {i18n.INDEX_PATTERNS_RESET}
              </ResetButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleSaveIndices}
                // disabled={isSavingDisabled}
                data-test-subj="add-index"
                fill
                fullWidth
                size="s"
              >
                {i18n.SAVE_INDEX_PATTERNS}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </PopoverContent>
      </EuiPopover>
    </EuiToolTip>
  );
});
Sourcerer.displayName = 'Sourcerer';

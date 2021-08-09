/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import * as i18n from './translations';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import { State } from '../../store';
import { getSourcererScopeSelector, SourcererScopeSelector } from './selectors';
import { getScopePatternListSelection } from '../../store/sourcerer/helpers';
import { DEFAULT_INDEX_PATTERN_ID } from '../../../../common/constants';

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
  const { selectedKipId, selectedPatterns, loading } = sourcererScope;
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const [selectedOption, setSelectedOption] = useState<string>(selectedKipId ?? '');
  const selectablePatternList = useMemo(() => {
    const theKip = kibanaIndexPatterns.find((kip) => kip.id === selectedOption);
    return theKip != null ? theKip.title.split(',') : [];
  }, [kibanaIndexPatterns, selectedOption]);

  const selectableOptions = useMemo(
    () =>
      selectablePatternList.map((indexName) => ({
        label: indexName,
        value: indexName,
      })),
    [selectablePatternList]
  );

  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    selectedPatterns.map((indexName) => ({
      label: indexName,
      value: indexName,
    }))
  );
  const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);

  const setPopoverIsOpenCb = useCallback(() => setPopoverIsOpen((prevState) => !prevState), []);
  const onChangeKip = useCallback(
    (newSelectedKip: string, newSelectedPatterns: string[]) => {
      dispatch(
        sourcererActions.setSelectedKip({
          id: scopeId,
          selectedKipId: newSelectedKip,
          selectedPatterns: newSelectedPatterns,
        })
      );
    },
    [dispatch, scopeId]
  );

  const renderOption = useCallback(
    ({ value }) => <span data-test-subj="index-name-option">{value}</span>,
    []
  );

  const onChangeCombo = useCallback((newSelectedOptions) => {
    setSelectedOptions(newSelectedOptions);
  }, []);

  const onChangeSuper = useCallback(
    (newSelectedOption) => {
      setSelectedOption(newSelectedOption);
      setSelectedOptions(
        getScopePatternListSelection(kibanaIndexPatterns, newSelectedOption, scopeId).map(
          (indexSelected: string) => ({
            label: indexSelected,
            value: indexSelected,
          })
        )
      );
    },
    [kibanaIndexPatterns, scopeId]
  );

  const resetDataSources = useCallback(() => {
    setSelectedOption(defaultIndexPattern.id);
    setSelectedOptions(
      getScopePatternListSelection(kibanaIndexPatterns, defaultIndexPattern.id, scopeId).map(
        (indexSelected: string) => ({
          label: indexSelected,
          value: indexSelected,
        })
      )
    );
  }, [defaultIndexPattern.id, kibanaIndexPatterns, scopeId]);

  const handleSaveIndices = useCallback(() => {
    onChangeKip(
      selectedOption,
      selectedOptions.map((so) => so.label)
    );
    setPopoverIsOpen(false);
  }, [onChangeKip, selectedOption, selectedOptions]);

  const handleClosePopOver = useCallback(() => {
    setPopoverIsOpen(false);
  }, []);
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
        inputDisplay:
          id === DEFAULT_INDEX_PATTERN_ID ? (
            <span data-test-subj="kip-option-super">
              <EuiIcon type="logoSecurity" size="s" /> {i18n.SIEM_KIP_LABEL}
            </span>
          ) : (
            <span data-test-subj="kip-option-super">
              <EuiIcon type="logoKibana" size="s" /> {title}
            </span>
          ),
        value: id,
      })),
    [kibanaIndexPatterns]
  );

  const comboBox = useMemo(
    () => (
      <EuiComboBox
        data-test-subj="indexPattern-switcher"
        placeholder={i18n.PICK_INDEX_PATTERNS}
        fullWidth
        options={selectableOptions}
        selectedOptions={selectedOptions}
        onChange={onChangeCombo}
        renderOption={renderOption}
      />
    ),
    [selectableOptions, onChangeCombo, renderOption, selectedOptions]
  );
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
      !deepEqual(selectedKipId, prevSelectedOption) && selectedKipId != null
        ? selectedKipId
        : prevSelectedOption
    );
  }, [selectedKipId]);
  useEffect(() => {
    setSelectedOptions(
      selectedPatterns.map((indexName) => ({
        label: indexName,
        value: indexName,
      }))
    );
  }, [selectedPatterns]);

  const tooltipContent = useMemo(() => (isPopoverOpen ? null : selectedPatterns.join(', ')), [
    selectedPatterns,
    isPopoverOpen,
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
          <EuiSpacer size="xs" />
          {comboBox}
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
                disabled={isSavingDisabled}
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

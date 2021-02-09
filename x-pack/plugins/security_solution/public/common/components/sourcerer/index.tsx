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
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
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
import { SourcererPatternType } from '../../store/sourcerer/model';

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
  const { configIndexPatterns, kibanaIndexPatterns, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, scopeId), deepEqual);
  const configAsSelected: sourcererModel.SelectedPatterns = useMemo(
    () => configIndexPatterns.map((title) => ({ title, id: SourcererPatternType.config })),
    [configIndexPatterns]
  );
  const { selectedPatterns, loading } = sourcererScope;
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  console.log('SOUsourcererScope', sourcererScope);
  debugger;
  const [selectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<string> & { key: string }>
  >(
    selectedPatterns.map(({ title, id }) => ({
      label: title,
      value: title,
      key: id,
    }))
  );
  const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);

  const setPopoverIsOpenCb = useCallback(() => setPopoverIsOpen((prevState) => !prevState), []);

  const onChangeIndexPattern = useCallback(
    (newSelectedPatterns: sourcererModel.SelectedPatterns) => {
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns: newSelectedPatterns,
        })
      );
    },
    [dispatch, scopeId]
  );

  const renderOption = useCallback(
    ({ value, key }) =>
      key !== SourcererPatternType.config && key !== SourcererPatternType.detections ? (
        <span data-test-subj="kip-option">
          <EuiIcon type="logoKibana" size="s" /> {value}
        </span>
      ) : (
        <span data-test-subj="config-option">{value}</span>
      ),
    []
  );

  const onChangeCombo = useCallback((newSelectedOptions) => {
    setSelectedOptions(newSelectedOptions);
  }, []);

  const resetDataSources = useCallback(() => {
    setSelectedOptions(
      configIndexPatterns.map((indexSelected) => ({
        label: indexSelected,
        value: indexSelected,
        key: SourcererPatternType.config,
      }))
    );
  }, [configIndexPatterns]);

  const handleSaveIndices = useCallback(() => {
    onChangeIndexPattern(
      selectedOptions.map((so) => ({ title: so.label, id: so.key ?? SourcererPatternType.config }))
    );
    setPopoverIsOpen(false);
  }, [onChangeIndexPattern, selectedOptions]);

  const handleClosePopOver = useCallback(() => {
    setPopoverIsOpen(false);
  }, []);

  const indexesPatternOptions = useMemo(
    () =>
      [...configAsSelected, ...kibanaIndexPatterns].reduce<
        Array<EuiComboBoxOptionOption<string> & { key: string }>
      >((acc, { title, id }) => {
        if (title != null && !acc.some((o) => o.label.includes(title))) {
          return [...acc, { label: title, value: title, key: id }];
        }
        return acc;
      }, []),
    [configAsSelected, kibanaIndexPatterns]
  );

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
        size="l"
        title={i18n.SOURCERER}
      >
        {i18n.SOURCERER}
      </EuiButtonEmpty>
    ),
    [setPopoverIsOpenCb, loading]
  );
  console.log({ indexesPatternOptions, selectedOptions });
  const comboBox = useMemo(
    () => (
      <EuiComboBox
        data-test-subj="indexPattern-switcher"
        placeholder={i18n.PICK_INDEX_PATTERNS}
        fullWidth
        options={indexesPatternOptions}
        selectedOptions={selectedOptions}
        onChange={onChangeCombo}
        renderOption={renderOption}
      />
    ),
    [indexesPatternOptions, onChangeCombo, renderOption, selectedOptions]
  );

  useEffect(() => {
    const newSelectedOptions = selectedPatterns.map(({ title, id }) => ({
      label: title,
      value: title,
      key: id,
    }));
    setSelectedOptions((prevSelectedOptions) => {
      if (!deepEqual(newSelectedOptions, prevSelectedOptions)) {
        return newSelectedOptions;
      }
      return prevSelectedOptions;
    });
  }, [selectedPatterns]);

  const tooltipContent = useMemo(
    () =>
      isPopoverOpen
        ? null
        : sourcererScope.selectedPatterns
            .map(({ title }) => title)
            .sort()
            .join(', '),
    [isPopoverOpen, sourcererScope.selectedPatterns]
  );

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
          {comboBox}
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <ResetButton
                aria-label={i18n.INDEX_PATTERNS_RESET}
                data-test-subj="sourcerer-reset"
                flush="left"
                onClick={resetDataSources}
                size="l"
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

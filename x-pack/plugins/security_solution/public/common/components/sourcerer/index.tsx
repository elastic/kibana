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
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import * as i18n from './translations';
import { sourcererActions, sourcererModel, sourcererSelectors } from '../../store/sourcerer';
import { getScopePatternListSelection } from '../../store/sourcerer/helpers';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { SourcererScopeName } from '../../store/sourcerer/model';

const PopoverContent = styled.div`
  width: 600px;
`;

const ResetButton = styled(EuiButtonEmpty)`
  width: fit-content;
`;
interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}

const getPatternListWithoutSignals = (
  patternList: string[],
  signalIndexName: string | null
): string[] => patternList.filter((p) => p !== signalIndexName);

export const Sourcerer = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const {
    defaultDataView,
    kibanaDataViews,
    signalIndexName,
    sourcererScope: { selectedDataViewId, selectedPatterns, loading },
  } = useDeepEqualSelector((state) => sourcererScopeSelector(state, scopeId));

  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const [dataViewId, setDataViewId] = useState<string>(selectedDataViewId ?? defaultDataView.id);

  const { patternList, selectablePatterns } = useMemo(() => {
    const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);
    return theDataView != null
      ? scopeId === SourcererScopeName.default
        ? {
            patternList: getPatternListWithoutSignals(
              theDataView.title
                .split(',')
                // remove duplicates patterns from selector
                .filter((pattern, i, self) => self.indexOf(pattern) === i),
              signalIndexName
            ),
            selectablePatterns: getPatternListWithoutSignals(
              theDataView.patternList,
              signalIndexName
            ),
          }
        : {
            patternList: theDataView.title
              .split(',')
              // remove duplicates patterns from selector
              .filter((pattern, i, self) => self.indexOf(pattern) === i),
            selectablePatterns: theDataView.patternList,
          }
      : { patternList: [], selectablePatterns: [] };
  }, [kibanaDataViews, scopeId, signalIndexName, dataViewId]);

  const selectableOptions = useMemo(
    () =>
      patternList.map((indexName) => ({
        label: indexName,
        value: indexName,
        disabled: !selectablePatterns.includes(indexName),
      })),
    [selectablePatterns, patternList]
  );

  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    selectedPatterns.map((indexName) => ({
      label: indexName,
      value: indexName,
    }))
  );
  const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);

  const setPopoverIsOpenCb = useCallback(() => setPopoverIsOpen((prevState) => !prevState), []);
  const onChangeDataView = useCallback(
    (newSelectedDataView: string, newSelectedPatterns: string[]) => {
      dispatch(
        sourcererActions.setSelectedDataView({
          id: scopeId,
          selectedDataViewId: newSelectedDataView,
          selectedPatterns: newSelectedPatterns,
        })
      );
    },
    [dispatch, scopeId]
  );

  const renderOption = useCallback(
    ({ value }) => <span data-test-subj="sourcerer-combo-option">{value}</span>,
    []
  );

  const onChangeCombo = useCallback((newSelectedOptions) => {
    setSelectedOptions(newSelectedOptions);
  }, []);

  const onChangeSuper = useCallback(
    (newSelectedOption) => {
      setDataViewId(newSelectedOption);
      setSelectedOptions(
        getScopePatternListSelection(
          kibanaDataViews.find((dataView) => dataView.id === newSelectedOption),
          scopeId,
          signalIndexName,
          newSelectedOption === defaultDataView.id
        ).map((indexSelected: string) => ({
          label: indexSelected,
          value: indexSelected,
        }))
      );
    },
    [defaultDataView.id, kibanaDataViews, scopeId, signalIndexName]
  );

  const resetDataSources = useCallback(() => {
    setDataViewId(defaultDataView.id);
    setSelectedOptions(
      getScopePatternListSelection(defaultDataView, scopeId, signalIndexName, true).map(
        (indexSelected: string) => ({
          label: indexSelected,
          value: indexSelected,
        })
      )
    );
  }, [defaultDataView, scopeId, signalIndexName]);

  const handleSaveIndices = useCallback(() => {
    onChangeDataView(
      dataViewId,
      selectedOptions.map((so) => so.label)
    );
    setPopoverIsOpen(false);
  }, [onChangeDataView, dataViewId, selectedOptions]);

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

  const dataViewSelectOptions = useMemo(
    () =>
      kibanaDataViews.map(({ title, id }) => ({
        inputDisplay:
          id === defaultDataView.id ? (
            <span data-test-subj="security-option-super">
              <EuiIcon type="logoSecurity" size="s" /> {i18n.SIEM_DATA_VIEW_LABEL}
            </span>
          ) : (
            <span data-test-subj="dataView-option-super">
              <EuiIcon type="logoKibana" size="s" /> {title}
            </span>
          ),
        value: id,
      })),
    [defaultDataView.id, kibanaDataViews]
  );

  useEffect(() => {
    setDataViewId((prevSelectedOption) =>
      selectedDataViewId != null && !deepEqual(selectedDataViewId, prevSelectedOption)
        ? selectedDataViewId
        : prevSelectedOption
    );
  }, [selectedDataViewId]);
  useEffect(() => {
    setSelectedOptions(
      selectedPatterns.map((indexName) => ({
        label: indexName,
        value: indexName,
      }))
    );
  }, [selectedPatterns]);

  const tooltipContent = useMemo(
    () => (isPopoverOpen ? null : selectedPatterns.join(', ')),
    [selectedPatterns, isPopoverOpen]
  );

  const buttonWithTooptip = useMemo(() => {
    return tooltipContent ? (
      <EuiToolTip position="top" content={tooltipContent} data-test-subj="sourcerer-tooltip">
        {trigger}
      </EuiToolTip>
    ) : (
      trigger
    );
  }, [trigger, tooltipContent]);

  return (
    <EuiPopover
      data-test-subj="sourcerer-popover"
      button={buttonWithTooptip}
      isOpen={isPopoverOpen}
      closePopover={handleClosePopOver}
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
        <EuiSuperSelect
          data-test-subj="sourcerer-select"
          placeholder={i18n.PICK_INDEX_PATTERNS}
          fullWidth
          options={dataViewSelectOptions}
          valueOfSelected={dataViewId}
          onChange={onChangeSuper}
        />
        <EuiSpacer size="xs" />
        <EuiComboBox
          data-test-subj="sourcerer-combo-box"
          fullWidth
          onChange={onChangeCombo}
          options={selectableOptions}
          placeholder={i18n.PICK_INDEX_PATTERNS}
          renderOption={renderOption}
          selectedOptions={selectedOptions}
        />
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
              data-test-subj="sourcerer-save"
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
  );
});
Sourcerer.displayName = 'Sourcerer';

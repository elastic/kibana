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
  EuiForm,
  EuiFormRow,
  EuiToolTip,
  EuiCallOut,
  EuiFormRowProps,
  EuiBadge,
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
import { SecurityPageName } from '../../../../common/constants';
import { useRouteSpy } from '../../utils/route/use_route_spy';

const FormRow = styled(EuiFormRow)<EuiFormRowProps & { $expandAdvancedOptions: boolean }>`
  display: ${({ $expandAdvancedOptions }) => ($expandAdvancedOptions ? 'flex' : 'none')};
  max-width: none;
`;

const StyledFormRow = styled(EuiFormRow)`
  max-width: none;
`;

const StyledButton = styled(EuiButtonEmpty)`
  &:enabled:focus,
  &:focus {
    background-color: transparent;
  }
`;

const ResetButton = styled(EuiButtonEmpty)`
  width: fit-content;
`;
interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}

const PopoverContent = styled.div`
  width: 600px;
`;

const StyledBadge = styled(EuiBadge)`
  margin-left: 8px;
`;

export const Sourcerer = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { defaultDataView, kibanaDataViews, signalIndexName, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, scopeId), deepEqual);
  const { selectedDataViewId, selectedPatterns, loading } = sourcererScope;
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const [dataViewId, setDataViewId] = useState<string>(selectedDataViewId ?? defaultDataView.id);

  const { patternList, selectablePatterns } = useMemo(() => {
    const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);
    return theDataView != null
      ? {
          patternList: theDataView.title
            .split(',')
            // remove duplicates patterns from selector
            .filter((pattern, i, self) => self.indexOf(pattern) === i),
          selectablePatterns: theDataView.patternList,
        }
      : { patternList: [], selectablePatterns: [] };
  }, [kibanaDataViews, dataViewId]);

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

  const defaultSelectedOptions = useMemo(
    () =>
      getScopePatternListSelection(
        kibanaDataViews.find((dataView) => dataView.id === dataViewId),
        scopeId,
        signalIndexName
      ).map((indexSelected: string) => ({
        label: indexSelected,
        value: indexSelected,
      })),
    [dataViewId, kibanaDataViews, scopeId, signalIndexName]
  );

  const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);
  const isModified = !defaultSelectedOptions.every((option) =>
    selectedOptions.find((selectedOption) => option.value === selectedOption.value)
  );

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
      setSelectedOptions(defaultSelectedOptions);
    },
    [defaultSelectedOptions]
  );

  const resetDataSources = useCallback(() => {
    setDataViewId(defaultDataView.id);
    setSelectedOptions(
      getScopePatternListSelection(defaultDataView, scopeId, signalIndexName).map(
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
      <StyledButton
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
        {isModified && <StyledBadge>{i18n.BADGE_TITLE}</StyledBadge>}
      </StyledButton>
    ),
    [loading, setPopoverIsOpenCb, isModified]
  );

  const dataViewSelectOptions = useMemo(
    () =>
      kibanaDataViews.map(({ title, id }) => ({
        inputDisplay:
          id === defaultDataView.id ? (
            <span data-test-subj="security-option-super">
              <EuiIcon type="logoSecurity" size="s" /> {i18n.SIEM_DATA_VIEW_LABEL}
              {isModified && id === dataViewId && <StyledBadge>{i18n.BADGE_TITLE}</StyledBadge>}
            </span>
          ) : (
            <span data-test-subj="dataView-option-super">
              <EuiIcon type="logoKibana" size="s" /> {title}
            </span>
          ),
        value: id,
      })),
    [dataViewId, defaultDataView.id, isModified, kibanaDataViews]
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

  const [expandAdvancedOptions, setExpandAdvancedOptions] = useState(false);

  const onExpandAdvancedOptionsClicked = useCallback(() => {
    setExpandAdvancedOptions((prevState) => !prevState);
  }, []);
  const advancedIndicies: string[] = [];
  const indiciesInCallout = advancedIndicies.join(',');
  const [{ pageName, detailName }] = useRouteSpy();
  const isReadOnly =
    pageName === SecurityPageName.alerts || (SecurityPageName.rules && detailName != null);
  const callOutMessage = useMemo(
    () => i18n.CALL_OUT_MESSAGE(indiciesInCallout),
    [indiciesInCallout]
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
          {isReadOnly && advancedIndicies?.length > 0 && (
            <EuiCallOut iconType="info" title={i18n.CALL_OUT_TITLE}>
              <p>{callOutMessage}</p>
            </EuiCallOut>
          )}
          <EuiSpacer size="s" />
          <EuiForm component="form">
            <StyledFormRow label={i18n.INDEX_PATTERNS_CHOOSE_DATA_VIEW_LABEL}>
              <EuiSuperSelect
                data-test-subj="sourcerer-select"
                placeholder={i18n.PICK_INDEX_PATTERNS}
                fullWidth
                options={dataViewSelectOptions}
                valueOfSelected={dataViewId}
                onChange={onChangeSuper}
                disabled={isReadOnly}
              />
            </StyledFormRow>

            <StyledButton
              color="text"
              onClick={onExpandAdvancedOptionsClicked}
              iconType={expandAdvancedOptions ? 'arrowDown' : 'arrowRight'}
            >
              {i18n.INDEX_PATTERNS_ADVANCED_OPTIONS_TITLE}
            </StyledButton>
            <FormRow
              label={i18n.INDEX_PATTERNS_LABEL}
              $expandAdvancedOptions={expandAdvancedOptions}
            >
              <EuiComboBox
                data-test-subj="sourcerer-combo-box"
                fullWidth
                onChange={onChangeCombo}
                options={selectableOptions}
                placeholder={i18n.PICK_INDEX_PATTERNS}
                renderOption={renderOption}
                selectedOptions={selectedOptions}
                isDisabled={isReadOnly}
              />
            </FormRow>

            {!isReadOnly && (
              <StyledFormRow>
                <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
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
              </StyledFormRow>
            )}
            <EuiSpacer size="s" />
          </EuiForm>
        </PopoverContent>
      </EuiPopover>
    </EuiToolTip>
  );
});
Sourcerer.displayName = 'Sourcerer';

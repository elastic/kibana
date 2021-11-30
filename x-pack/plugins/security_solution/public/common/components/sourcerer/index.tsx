/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiCheckbox,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSuperSelect,
  EuiToolTip,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import * as i18n from './translations';
import { sourcererActions, sourcererModel, sourcererSelectors } from '../../store/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { checkIfIndicesExist } from '../../store/sourcerer/helpers';
import { usePickIndexPatterns } from './use_pick_index_patterns';
import {
  FormRow,
  getDataViewSelectOptions,
  getTooltipContent,
  PopoverContent,
  ResetButton,
  StyledBadge,
  StyledButton,
  StyledFormRow,
} from './helpers';

interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}

export const Sourcerer = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const isDetectionsSourcerer = scopeId === SourcererScopeName.detections;
  const isTimelineSourcerer = scopeId === SourcererScopeName.timeline;

  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const {
    defaultDataView,
    kibanaDataViews,
    signalIndexName,
    sourcererScope: { selectedDataViewId, selectedPatterns, loading },
    sourcererDataView,
  } = useDeepEqualSelector((state) => sourcererScopeSelector(state, scopeId));
  const indicesExist = useMemo(
    () => checkIfIndicesExist({ scopeId, signalIndexName, sourcererDataView }),
    [scopeId, signalIndexName, sourcererDataView]
  );

  const [isOnlyDetectionAlertsChecked, setIsOnlyDetectionAlertsChecked] = useState(
    isTimelineSourcerer && selectedPatterns.join() === signalIndexName
  );

  const isOnlyDetectionAlerts: boolean =
    isDetectionsSourcerer || (isTimelineSourcerer && isOnlyDetectionAlertsChecked);

  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewId, setDataViewId] = useState<string>(selectedDataViewId ?? defaultDataView.id);

  const {
    isModified,
    onChangeCombo,
    renderOption,
    selectableOptions,
    selectedOptions,
    setIndexPatternsByDataView,
  } = usePickIndexPatterns({
    dataViewId,
    defaultDataViewId: defaultDataView.id,
    isOnlyDetectionAlerts,
    kibanaDataViews,
    scopeId,
    selectedPatterns,
    signalIndexName,
  });
  const onCheckboxChanged = useCallback(
    (e) => {
      setIsOnlyDetectionAlertsChecked(e.target.checked);
      setDataViewId(defaultDataView.id);
      setIndexPatternsByDataView(defaultDataView.id, e.target.checked);
    },
    [defaultDataView.id, setIndexPatternsByDataView]
  );
  const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);
  const [expandAdvancedOptions, setExpandAdvancedOptions] = useState(false);

  const setPopoverIsOpenCb = useCallback(() => {
    setPopoverIsOpen((prevState) => !prevState);
    setExpandAdvancedOptions(false); // we always want setExpandAdvancedOptions collapsed by default when popover opened
  }, []);
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

  const onChangeSuper = useCallback(
    (newSelectedOption) => {
      setDataViewId(newSelectedOption);
      setIndexPatternsByDataView(newSelectedOption);
    },
    [setIndexPatternsByDataView]
  );

  const resetDataSources = useCallback(() => {
    setDataViewId(defaultDataView.id);
    setIndexPatternsByDataView(defaultDataView.id);
    setIsOnlyDetectionAlertsChecked(false);
  }, [defaultDataView.id, setIndexPatternsByDataView]);

  const handleSaveIndices = useCallback(() => {
    const patterns = selectedOptions.map((so) => so.label);
    onChangeDataView(dataViewId, patterns);
    setPopoverIsOpen(false);
  }, [onChangeDataView, dataViewId, selectedOptions]);

  const handleClosePopOver = useCallback(() => {
    setPopoverIsOpen(false);
    setExpandAdvancedOptions(false);
  }, []);
  const trigger = useMemo(
    () => (
      <StyledButton
        aria-label={i18n.DATA_VIEW}
        data-test-subj={isTimelineSourcerer ? 'timeline-sourcerer-trigger' : 'sourcerer-trigger'}
        flush="left"
        iconSide="right"
        iconType="arrowDown"
        isLoading={loading}
        onClick={setPopoverIsOpenCb}
        title={i18n.DATA_VIEW}
      >
        {i18n.DATA_VIEW}
        {isModified === 'modified' && <StyledBadge>{i18n.MODIFIED_BADGE_TITLE}</StyledBadge>}
        {isModified === 'alerts' && (
          <StyledBadge data-test-subj="sourcerer-alerts-badge">
            {i18n.ALERTS_BADGE_TITLE}
          </StyledBadge>
        )}
      </StyledButton>
    ),
    [isTimelineSourcerer, loading, setPopoverIsOpenCb, isModified]
  );

  const dataViewSelectOptions = useMemo(
    () =>
      getDataViewSelectOptions({
        dataViewId,
        defaultDataView,
        isModified: isModified === 'modified',
        isOnlyDetectionAlerts,
        kibanaDataViews,
      }),
    [dataViewId, defaultDataView, isModified, isOnlyDetectionAlerts, kibanaDataViews]
  );

  useEffect(() => {
    setDataViewId((prevSelectedOption) =>
      selectedDataViewId != null && !deepEqual(selectedDataViewId, prevSelectedOption)
        ? selectedDataViewId
        : prevSelectedOption
    );
  }, [selectedDataViewId]);

  const tooltipContent = useMemo(
    () =>
      getTooltipContent({
        isOnlyDetectionAlerts,
        isPopoverOpen,
        selectedPatterns,
        signalIndexName,
      }),
    [isPopoverOpen, isOnlyDetectionAlerts, signalIndexName, selectedPatterns]
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

  const onExpandAdvancedOptionsClicked = useCallback(() => {
    setExpandAdvancedOptions((prevState) => !prevState);
  }, []);

  return indicesExist ? (
    <EuiPopover
      data-test-subj={isTimelineSourcerer ? 'timeline-sourcerer-popover' : 'sourcerer-popover'}
      button={buttonWithTooptip}
      isOpen={isPopoverOpen}
      closePopover={handleClosePopOver}
      display="block"
      repositionOnScroll
      ownFocus
    >
      <PopoverContent>
        <EuiPopoverTitle data-test-subj="sourcerer-title">
          <>{i18n.SELECT_DATA_VIEW}</>
        </EuiPopoverTitle>
        {isOnlyDetectionAlerts && (
          <EuiCallOut
            data-test-subj="sourcerer-callout"
            size="s"
            iconType="iInCircle"
            title={isTimelineSourcerer ? i18n.CALL_OUT_TIMELINE_TITLE : i18n.CALL_OUT_TITLE}
          />
        )}
        <EuiSpacer size="s" />
        <EuiForm component="form">
          {isTimelineSourcerer && (
            <StyledFormRow>
              <EuiCheckbox
                id="sourcerer-alert-only-checkbox"
                data-test-subj="sourcerer-alert-only-checkbox"
                label={i18n.ALERTS_CHECKBOX_LABEL}
                checked={isOnlyDetectionAlertsChecked}
                onChange={onCheckboxChanged}
              />
            </StyledFormRow>
          )}

          <StyledFormRow label={i18n.INDEX_PATTERNS_CHOOSE_DATA_VIEW_LABEL}>
            <EuiSuperSelect
              data-test-subj="sourcerer-select"
              disabled={isOnlyDetectionAlerts}
              fullWidth
              onChange={onChangeSuper}
              options={dataViewSelectOptions}
              placeholder={i18n.INDEX_PATTERNS_CHOOSE_DATA_VIEW_LABEL}
              valueOfSelected={dataViewId}
            />
          </StyledFormRow>

          <EuiSpacer size="m" />

          <StyledButton
            color="text"
            onClick={onExpandAdvancedOptionsClicked}
            iconType={expandAdvancedOptions ? 'arrowDown' : 'arrowRight'}
            data-test-subj="sourcerer-advanced-options-toggle"
          >
            {i18n.INDEX_PATTERNS_ADVANCED_OPTIONS_TITLE}
          </StyledButton>
          {expandAdvancedOptions && <EuiSpacer size="m" />}
          <FormRow
            label={i18n.INDEX_PATTERNS_LABEL}
            $expandAdvancedOptions={expandAdvancedOptions}
            helpText={isOnlyDetectionAlerts ? undefined : i18n.INDEX_PATTERNS_DESCRIPTIONS}
          >
            <EuiComboBox
              data-test-subj="sourcerer-combo-box"
              fullWidth
              isDisabled={isOnlyDetectionAlerts}
              onChange={onChangeCombo}
              options={selectableOptions}
              placeholder={i18n.PICK_INDEX_PATTERNS}
              renderOption={renderOption}
              selectedOptions={selectedOptions}
            />
          </FormRow>

          {!isDetectionsSourcerer && (
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
  ) : null;
});
Sourcerer.displayName = 'Sourcerer';

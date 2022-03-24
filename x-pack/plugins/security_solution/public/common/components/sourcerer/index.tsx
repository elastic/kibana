/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiForm,
  EuiOutsideClickDetector,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import React, { ChangeEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import * as i18n from './translations';
import { sourcererActions, sourcererModel, sourcererSelectors } from '../../store/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { usePickIndexPatterns } from './use_pick_index_patterns';
import { FormRow, PopoverContent, StyledButton, StyledFormRow } from './helpers';
import { TemporarySourcerer } from './temporary';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useUpdateDataView } from './use_update_data_view';
import { Trigger } from './trigger';
import { AlertsCheckbox, SaveButtons, SourcererCallout } from './sub_components';
import { useSignalHelpers } from '../../containers/sourcerer/use_signal_helpers';

export interface SourcererComponentProps {
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
    sourcererScope: {
      selectedDataViewId,
      selectedPatterns,
      missingPatterns: sourcererMissingPatterns,
    },
  } = useDeepEqualSelector((state) => sourcererScopeSelector(state, scopeId));

  const { pollForSignalIndex } = useSignalHelpers();

  useEffect(() => {
    if (pollForSignalIndex != null && (isTimelineSourcerer || isDetectionsSourcerer)) {
      pollForSignalIndex();
    }
  }, [isDetectionsSourcerer, isTimelineSourcerer, pollForSignalIndex]);

  const { activePatterns, indicesExist, loading } = useSourcererDataView(scopeId);
  const [missingPatterns, setMissingPatterns] = useState<string[]>(
    activePatterns && activePatterns.length > 0
      ? sourcererMissingPatterns.filter((p) => activePatterns.includes(p))
      : []
  );
  useEffect(() => {
    if (activePatterns && activePatterns.length > 0) {
      setMissingPatterns(sourcererMissingPatterns.filter((p) => activePatterns.includes(p)));
    }
  }, [activePatterns, sourcererMissingPatterns]);

  const [isOnlyDetectionAlertsChecked, setIsOnlyDetectionAlertsChecked] = useState(
    isTimelineSourcerer && selectedPatterns.join() === signalIndexName
  );

  const onUpdateDetectionAlertsChecked = useCallback(() => {
    setIsOnlyDetectionAlertsChecked(
      isTimelineSourcerer && selectedPatterns.join() === signalIndexName
    );
  }, [isTimelineSourcerer, selectedPatterns, signalIndexName]);

  useEffect(() => {
    onUpdateDetectionAlertsChecked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatterns]);

  const isOnlyDetectionAlerts: boolean =
    isDetectionsSourcerer || (isTimelineSourcerer && isOnlyDetectionAlertsChecked);

  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewId, setDataViewId] = useState<string | null>(selectedDataViewId);

  const {
    allOptions,
    dataViewSelectOptions,
    loadingIndexPatterns,
    isModified,
    handleOutsideClick,
    onChangeCombo: onChangeIndexPatterns,
    renderOption,
    selectedOptions,
    setIndexPatternsByDataView,
  } = usePickIndexPatterns({
    dataViewId,
    defaultDataViewId: defaultDataView.id,
    isOnlyDetectionAlerts,
    kibanaDataViews,
    missingPatterns,
    scopeId,
    selectedDataViewId,
    selectedPatterns,
    signalIndexName,
  });

  const onCheckboxChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setIsOnlyDetectionAlertsChecked(e.target.checked);
      setDataViewId(defaultDataView.id);
      setIndexPatternsByDataView(defaultDataView.id, e.target.checked);
    },
    [defaultDataView.id, setIndexPatternsByDataView]
  );

  const [expandAdvancedOptions, setExpandAdvancedOptions] = useState(false);
  const [isShowingUpdateModal, setIsShowingUpdateModal] = useState(false);

  const setPopoverIsOpenCb = useCallback(() => {
    setPopoverIsOpen((prevState) => !prevState);
    setExpandAdvancedOptions(false); // we always want setExpandAdvancedOptions collapsed by default when popover opened
  }, []);
  const dispatchChangeDataView = useCallback(
    (
      newSelectedDataView: string,
      newSelectedPatterns: string[],
      shouldValidateSelectedPatterns?: boolean
    ) => {
      dispatch(
        sourcererActions.setSelectedDataView({
          id: scopeId,
          selectedDataViewId: newSelectedDataView,
          selectedPatterns: newSelectedPatterns,
          shouldValidateSelectedPatterns,
        })
      );
    },
    [dispatch, scopeId]
  );

  const onChangeDataView = useCallback(
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
    setMissingPatterns([]);
  }, [defaultDataView.id, setIndexPatternsByDataView]);

  const handleSaveIndices = useCallback(() => {
    const patterns = selectedOptions.map((so) => so.label);
    if (dataViewId != null) {
      dispatchChangeDataView(dataViewId, patterns);
    }
    setPopoverIsOpen(false);
  }, [dispatchChangeDataView, dataViewId, selectedOptions]);

  const handleClosePopOver = useCallback(() => {
    setPopoverIsOpen(false);
    setExpandAdvancedOptions(false);
  }, []);

  // deprecated timeline index pattern handlers
  const onContinueUpdateDeprecated = useCallback(() => {
    setIsShowingUpdateModal(false);
    const patterns = selectedPatterns.filter((pattern) =>
      defaultDataView.patternList.includes(pattern)
    );
    dispatchChangeDataView(defaultDataView.id, patterns);
    setPopoverIsOpen(false);
  }, [defaultDataView.id, defaultDataView.patternList, dispatchChangeDataView, selectedPatterns]);

  const onUpdateDeprecated = useCallback(() => {
    // are all the patterns in the default?
    if (missingPatterns.length === 0) {
      onContinueUpdateDeprecated();
    } else {
      // open modal
      setIsShowingUpdateModal(true);
    }
  }, [missingPatterns, onContinueUpdateDeprecated]);

  const [isTriggerDisabled, setIsTriggerDisabled] = useState(false);

  const onOpenAndReset = useCallback(() => {
    setPopoverIsOpen(true);
    resetDataSources();
  }, [resetDataSources]);

  const updateDataView = useUpdateDataView(onOpenAndReset);
  const onUpdateDataView = useCallback(async () => {
    const isUiSettingsSuccess = await updateDataView(missingPatterns);
    setIsShowingUpdateModal(false);
    setPopoverIsOpen(false);

    if (isUiSettingsSuccess) {
      dispatchChangeDataView(
        defaultDataView.id,
        // to be at this stage, activePatterns is defined, the ?? selectedPatterns is to make TS happy
        activePatterns ?? selectedPatterns,
        false
      );
      setIsTriggerDisabled(true);
    }
  }, [
    activePatterns,
    defaultDataView.id,
    missingPatterns,
    dispatchChangeDataView,
    selectedPatterns,
    updateDataView,
  ]);

  useEffect(() => {
    setDataViewId(selectedDataViewId);
  }, [selectedDataViewId]);

  const onOutsideClick = useCallback(() => {
    setDataViewId(selectedDataViewId);
    setMissingPatterns(sourcererMissingPatterns);
    onUpdateDetectionAlertsChecked();
    handleOutsideClick();
  }, [
    handleOutsideClick,
    onUpdateDetectionAlertsChecked,
    selectedDataViewId,
    sourcererMissingPatterns,
  ]);

  const onExpandAdvancedOptionsClicked = useCallback(() => {
    setExpandAdvancedOptions((prevState) => !prevState);
  }, []);

  // always show sourcerer in timeline
  return indicesExist || scopeId === SourcererScopeName.timeline ? (
    <EuiPopover
      panelClassName="sourcererPopoverPanel"
      button={
        <Trigger
          activePatterns={activePatterns}
          disabled={isTriggerDisabled}
          isModified={isModified}
          isOnlyDetectionAlerts={isOnlyDetectionAlerts}
          isPopoverOpen={isPopoverOpen}
          isTimelineSourcerer={isTimelineSourcerer}
          loading={loading}
          onClick={setPopoverIsOpenCb}
          selectedPatterns={selectedPatterns}
          signalIndexName={signalIndexName}
        />
      }
      closePopover={handleClosePopOver}
      data-test-subj={isTimelineSourcerer ? 'timeline-sourcerer-popover' : 'sourcerer-popover'}
      display="block"
      isOpen={isPopoverOpen}
      ownFocus
      repositionOnScroll
    >
      <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
        <PopoverContent>
          <EuiPopoverTitle data-test-subj="sourcerer-title">
            <>{i18n.SELECT_DATA_VIEW}</>
          </EuiPopoverTitle>
          <SourcererCallout
            isOnlyDetectionAlerts={isOnlyDetectionAlerts}
            title={isTimelineSourcerer ? i18n.CALL_OUT_TIMELINE_TITLE : i18n.CALL_OUT_TITLE}
          />
          <EuiSpacer size="s" />
          {(dataViewId === null && isModified === 'deprecated') ||
          isModified === 'missingPatterns' ? (
            <TemporarySourcerer
              activePatterns={activePatterns}
              indicesExist={indicesExist}
              isModified={isModified}
              isShowingUpdateModal={isShowingUpdateModal}
              missingPatterns={missingPatterns}
              onContinueWithoutUpdate={onContinueUpdateDeprecated}
              onDismiss={setPopoverIsOpenCb}
              onDismissModal={() => setIsShowingUpdateModal(false)}
              onReset={resetDataSources}
              onUpdateStepOne={isModified === 'deprecated' ? onUpdateDeprecated : onUpdateDataView}
              onUpdateStepTwo={onUpdateDataView}
              selectedPatterns={selectedPatterns}
            />
          ) : (
            <EuiForm component="form">
              <>
                <AlertsCheckbox
                  isShow={isTimelineSourcerer}
                  checked={isOnlyDetectionAlertsChecked}
                  onChange={onCheckboxChanged}
                />
                {dataViewId && (
                  <StyledFormRow label={i18n.INDEX_PATTERNS_CHOOSE_DATA_VIEW_LABEL}>
                    <EuiSuperSelect
                      data-test-subj="sourcerer-select"
                      isLoading={loadingIndexPatterns}
                      disabled={isOnlyDetectionAlerts}
                      fullWidth
                      onChange={onChangeDataView}
                      options={dataViewSelectOptions}
                      placeholder={i18n.INDEX_PATTERNS_CHOOSE_DATA_VIEW_LABEL}
                      valueOfSelected={dataViewId}
                    />
                  </StyledFormRow>
                )}

                <EuiSpacer size="m" />
                <StyledButton
                  color="text"
                  data-test-subj="sourcerer-advanced-options-toggle"
                  iconType={expandAdvancedOptions ? 'arrowDown' : 'arrowRight'}
                  onClick={onExpandAdvancedOptionsClicked}
                >
                  {i18n.INDEX_PATTERNS_ADVANCED_OPTIONS_TITLE}
                </StyledButton>
                {expandAdvancedOptions && <EuiSpacer size="m" />}
                <FormRow
                  isDisabled={loadingIndexPatterns}
                  $expandAdvancedOptions={expandAdvancedOptions}
                  helpText={isOnlyDetectionAlerts ? undefined : i18n.INDEX_PATTERNS_DESCRIPTIONS}
                  label={i18n.INDEX_PATTERNS_LABEL}
                >
                  <EuiComboBox
                    data-test-subj="sourcerer-combo-box"
                    fullWidth
                    isDisabled={isOnlyDetectionAlerts || loadingIndexPatterns}
                    onChange={onChangeIndexPatterns}
                    options={allOptions}
                    placeholder={i18n.PICK_INDEX_PATTERNS}
                    renderOption={renderOption}
                    selectedOptions={selectedOptions}
                  />
                </FormRow>

                <SaveButtons
                  disableSave={selectedOptions.length === 0}
                  isShow={!isDetectionsSourcerer}
                  onReset={resetDataSources}
                  onSave={handleSaveIndices}
                />
              </>
              <EuiSpacer size="s" />
            </EuiForm>
          )}
        </PopoverContent>
      </EuiOutsideClickDetector>
    </EuiPopover>
  ) : null;
});
Sourcerer.displayName = 'Sourcerer';

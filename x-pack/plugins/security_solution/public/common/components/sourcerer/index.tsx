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
  EuiOutsideClickDetector,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import * as i18n from './translations';
import { sourcererActions, sourcererModel, sourcererSelectors } from '../../store/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { usePickIndexPatterns } from './use_pick_index_patterns';
import { FormRow, PopoverContent, ResetButton, StyledButton, StyledFormRow } from './helpers';
import { TemporarySourcerer } from './temporary';
import { UpdateDefaultDataViewModal } from './update_default_data_view_modal';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useUpdateDataView } from './use_update_data_view';
import { Trigger } from './trigger';

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
    sourcererScope: {
      selectedDataViewId,
      selectedPatterns,
      missingPatterns: sourcererMissingPatterns,
    },
  } = useDeepEqualSelector((state) => sourcererScopeSelector(state, scopeId));

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

  const isOnlyDetectionAlerts: boolean =
    isDetectionsSourcerer || (isTimelineSourcerer && isOnlyDetectionAlertsChecked);
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewId, setDataViewId] = useState<string | null>(selectedDataViewId);

  const {
    allOptions,
    dataViewSelectOptions,
    isModified,
    onChangeCombo,
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

  const [expandAdvancedOptions, setExpandAdvancedOptions] = useState(false);
  const [isShowingUpdateModal, setIsShowingUpdateModal] = useState(false);

  const setPopoverIsOpenCb = useCallback(() => {
    setPopoverIsOpen((prevState) => !prevState);
    setExpandAdvancedOptions(false); // we always want setExpandAdvancedOptions collapsed by default when popover opened
  }, []);
  const onChangeDataView = useCallback(
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
    setMissingPatterns([]);
  }, [defaultDataView.id, setIndexPatternsByDataView]);

  const handleSaveIndices = useCallback(() => {
    const patterns = selectedOptions.map((so) => so.label);
    if (dataViewId != null) {
      onChangeDataView(dataViewId, patterns);
    }
    setPopoverIsOpen(false);
  }, [onChangeDataView, dataViewId, selectedOptions]);

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
    onChangeDataView(defaultDataView.id, patterns);
    setPopoverIsOpen(false);
  }, [defaultDataView.id, defaultDataView.patternList, onChangeDataView, selectedPatterns]);

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
      onChangeDataView(
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
    onChangeDataView,
    selectedPatterns,
    updateDataView,
  ]);

  useEffect(() => {
    setDataViewId(selectedDataViewId);
  }, [selectedDataViewId]);

  const onOutsideClick = useCallback(() => {
    setDataViewId(selectedDataViewId);
    setMissingPatterns(sourcererMissingPatterns);
  }, [selectedDataViewId, sourcererMissingPatterns]);

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
          {isOnlyDetectionAlerts && (
            <EuiCallOut
              data-test-subj="sourcerer-callout"
              iconType="iInCircle"
              size="s"
              title={isTimelineSourcerer ? i18n.CALL_OUT_TIMELINE_TITLE : i18n.CALL_OUT_TITLE}
            />
          )}
          <EuiSpacer size="s" />
          {isModified === 'deprecated' || isModified === 'missingPatterns' ? (
            <>
              <TemporarySourcerer
                activePatterns={activePatterns}
                indicesExist={indicesExist}
                isModified={isModified}
                missingPatterns={missingPatterns}
                onClick={resetDataSources}
                onClose={setPopoverIsOpenCb}
                onUpdate={isModified === 'deprecated' ? onUpdateDeprecated : onUpdateDataView}
                selectedPatterns={selectedPatterns}
              />
              <UpdateDefaultDataViewModal
                isShowing={isShowingUpdateModal}
                missingPatterns={missingPatterns}
                onClose={() => setIsShowingUpdateModal(false)}
                onContinue={onContinueUpdateDeprecated}
                onUpdate={onUpdateDataView}
              />
            </>
          ) : (
            <EuiForm component="form">
              <>
                {isTimelineSourcerer && (
                  <StyledFormRow>
                    <EuiCheckbox
                      checked={isOnlyDetectionAlertsChecked}
                      data-test-subj="sourcerer-alert-only-checkbox"
                      id="sourcerer-alert-only-checkbox"
                      label={i18n.ALERTS_CHECKBOX_LABEL}
                      onChange={onCheckboxChanged}
                    />
                  </StyledFormRow>
                )}
                {dataViewId && (
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
                  $expandAdvancedOptions={expandAdvancedOptions}
                  helpText={isOnlyDetectionAlerts ? undefined : i18n.INDEX_PATTERNS_DESCRIPTIONS}
                  label={i18n.INDEX_PATTERNS_LABEL}
                >
                  <EuiComboBox
                    data-test-subj="sourcerer-combo-box"
                    fullWidth
                    isDisabled={isOnlyDetectionAlerts}
                    onChange={onChangeCombo}
                    options={allOptions}
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
                          disabled={selectedOptions.length === 0}
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

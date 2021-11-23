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
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import * as i18n from './translations';
import { sourcererActions, sourcererModel, sourcererSelectors } from '../../store/sourcerer';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { SourcererScopeName } from '../../store/sourcerer/model';
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
import { DeprecatedSourcerer } from './deprecated';
import { UpdateDefaultDataViewModal } from './update_default_data_view_modal';
import { useKibana } from '../../lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { ensurePatternFormat } from '../../store/sourcerer/helpers';

interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}

const StyledRefreshButton = styled(EuiButton)`
  float: right;
`;

export const Sourcerer = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const isDetectionsSourcerer = scopeId === SourcererScopeName.detections;
  const isTimelineSourcerer = scopeId === SourcererScopeName.timeline;
  const { uiSettings } = useKibana().services;

  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const {
    defaultDataView,
    kibanaDataViews,
    signalIndexName,
    sourcererScope: { selectedDataViewId, selectedPatterns, loading },
  } = useDeepEqualSelector((state) => sourcererScopeSelector(state, scopeId));

  const [isOnlyDetectionAlertsChecked, setIsOnlyDetectionAlertsChecked] = useState(
    isTimelineSourcerer && selectedPatterns.join() === signalIndexName
  );

  const isOnlyDetectionAlerts: boolean =
    isDetectionsSourcerer || (isTimelineSourcerer && isOnlyDetectionAlertsChecked);

  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const [dataViewId, setDataViewId] = useState<string | null>(selectedDataViewId);
  const { addSuccess, addError } = useAppToasts();
  const missingPatterns = selectedPatterns.filter(
    (pattern) => defaultDataView.title.indexOf(pattern) === -1
  );
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
  const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);
  const [expandAdvancedOptions, setExpandAdvancedOptions] = useState(false);
  const [isShowingUpdateModal, setIsShowingUpdateModal] = useState(false);
  const [missingIndexPatterns, setMissingIndexPatterns] = useState<string[]>([]);
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
      setMissingIndexPatterns(missingPatterns);
    }
  }, [missingPatterns, onContinueUpdateDeprecated]);

  const onPageReload = useCallback(() => {
    document.location.reload();
  }, []);

  const onUpdateDataView = useCallback(async () => {
    // @Angela this is where your work is for "Add index pattern"
    // update ui settings string
    // uiSetttings.get(DEFAULT_INDEX_KEY)
    // uiSettings.set(DEFAULT_INDEX_KEY, [...old, ...new])
    // close modal and sourcerer

    const defaultIndex = await uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
    const newSelectedOptions = [...defaultIndex, ...missingIndexPatterns];
    const isSuccess = await uiSettings.set(
      DEFAULT_INDEX_KEY,
      ensurePatternFormat(newSelectedOptions)
    );

    setIsShowingUpdateModal(false);
    setPopoverIsOpen(false);
    // make alternate onChangeDataView/setSelectedDataView that does NOT validate, validation will happen after refresh
    // but technically sourcerer is in a "wrong" state until the refresh happens.
    if (isSuccess) {
      onChangeDataView(defaultDataView.id, newSelectedOptions, false);
      // openToast() to refresh page
      // show toaster to refresh page when confirmed
      // that ui settings update was successful
      addSuccess({
        color: 'success',
        title: toMountPoint(i18n.SUCCESS_TOAST_TITLE),
        text: toMountPoint(
          <StyledRefreshButton onClick={onPageReload}>{i18n.RELOAD_PAGE_TITLE}</StyledRefreshButton>
        ),
        toastLifeTimeMs: 600000,
      });
    } else {
      addError(new Error(i18n.FAILURE_TOAST_TITLE), {
        title: i18n.FAILURE_TOAST_TITLE,
        toastMessage: i18n.FAILURE_TOAST_TEXT,
      });
    }
  }, [
    addError,
    addSuccess,
    defaultDataView.id,
    missingIndexPatterns,
    onChangeDataView,
    onPageReload,
    uiSettings,
  ]);

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
        {isModified === 'deprecated' && (
          <StyledBadge color="warning" data-test-subj="sourcerer-alerts-badge">
            {i18n.DEPRECATED_BADGE_TITLE}
          </StyledBadge>
        )}
      </StyledButton>
    ),
    [isTimelineSourcerer, loading, setPopoverIsOpenCb, isModified]
  );

  const dataViewSelectOptions = useMemo(
    () =>
      dataViewId != null
        ? getDataViewSelectOptions({
            dataViewId,
            defaultDataView,
            isModified: isModified === 'modified',
            isOnlyDetectionAlerts,
            kibanaDataViews,
          })
        : [],
    [dataViewId, defaultDataView, isModified, isOnlyDetectionAlerts, kibanaDataViews]
  );

  useEffect(() => {
    setDataViewId(selectedDataViewId);
  }, [selectedDataViewId]);

  const onOutsideClick = useCallback(() => {
    setDataViewId(selectedDataViewId);
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

  return (
    <EuiPopover
      panelClassName="sourcererPopoverPanel"
      button={buttonWithTooptip}
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
          {isModified !== 'deprecated' && dataViewId != null ? (
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
              </>
              <EuiSpacer size="s" />
            </EuiForm>
          ) : (
            <>
              <DeprecatedSourcerer
                onClick={resetDataSources}
                onClose={setPopoverIsOpenCb}
                onUpdate={onUpdateDeprecated}
                selectedPatterns={selectedPatterns}
              />
              <UpdateDefaultDataViewModal
                isShowing={isShowingUpdateModal}
                missingPatterns={missingIndexPatterns}
                onClose={() => setIsShowingUpdateModal(false)}
                onContinue={onContinueUpdateDeprecated}
                onUpdate={onUpdateDataView}
              />
            </>
          )}
        </PopoverContent>
      </EuiOutsideClickDetector>
    </EuiPopover>
  );
});
Sourcerer.displayName = 'Sourcerer';

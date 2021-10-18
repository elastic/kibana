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
import { useDispatch, useSelector } from 'react-redux';

import * as i18n from './translations';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import { State } from '../../store';
import { getSourcererScopeSelector, SourcererScopeSelector } from './selectors';
import { SecurityPageName } from '../../../../common/constants';
import { useRouteSpy } from '../../utils/route/use_route_spy';
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

interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
}

export const Sourcerer = React.memo<SourcererComponentProps>(({ scope: scopeId }) => {
  const dispatch = useDispatch();
  const [{ pageName, detailName }] = useRouteSpy();
  const isTimelineSourcerer = scopeId === SourcererScopeName.timeline;
  const showAlertsOnlyCheckbox = isTimelineSourcerer;
  const isAlertsOrRulesDetailsPage =
    pageName === SecurityPageName.alerts ||
    (pageName === SecurityPageName.rules && detailName != null);

  const [isOnlyDetectionAlertsChecked, setIsOnlyDetectionAlertsChecked] = useState(false);
  const isOnlyDetectionAlerts: boolean =
    (isAlertsOrRulesDetailsPage && !isTimelineSourcerer) ||
    (!!isTimelineSourcerer && isOnlyDetectionAlertsChecked);

  const onCheckboxChanged = useCallback((e) => {
    setIsOnlyDetectionAlertsChecked(e.target.checked);
  }, []);
  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { defaultDataView, kibanaDataViews, signalIndexName, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, scopeId), deepEqual);
  const { selectedDataViewId, selectedPatterns, loading } = sourcererScope;
  const [isPopoverOpen, setPopoverIsOpen] = useState(false);
  const defaultSelectedDataView = selectedDataViewId ?? defaultDataView.id;
  const [dataViewId, setDataViewId] = useState<string>(defaultSelectedDataView);

  const alertsOptions = useMemo(
    () =>
      signalIndexName
        ? [
            {
              label: signalIndexName,
              value: signalIndexName,
            },
          ]
        : [],
    [signalIndexName]
  );

  const {
    isModified,
    onChangeCombo,
    renderOption,
    selectableOptions,
    selectedOptions,
    setIndexPatternsByDataView,
  } = usePickIndexPatterns({
    alertsOptions,
    dataViewId,
    isOnlyDetectionAlerts,
    kibanaDataViews,
    scopeId,
    selectedPatterns,
    signalIndexName,
  });

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
    setDataViewId(defaultSelectedDataView);
    setIndexPatternsByDataView(defaultSelectedDataView);
  }, [defaultSelectedDataView, setIndexPatternsByDataView]);

  const handleSaveIndices = useCallback(() => {
    onChangeDataView(
      dataViewId,
      selectedOptions.map((so) => so.label)
    );
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
        {isModified && <StyledBadge>{i18n.MODIFIED_BADGE_TITLE}</StyledBadge>}
        {isOnlyDetectionAlerts && (
          <StyledBadge data-test-subj="sourcerer-alerts-badge">
            {i18n.ALERTS_BADGE_TITLE}
          </StyledBadge>
        )}
      </StyledButton>
    ),
    [isTimelineSourcerer, loading, setPopoverIsOpenCb, isModified, isOnlyDetectionAlerts]
  );

  const dataViewSelectOptions = useMemo(
    () =>
      getDataViewSelectOptions({
        dataViewId,
        defaultDataView,
        isModified,
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
  }, [isOnlyDetectionAlerts, selectedDataViewId]);

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

  const onExpandAdvancedOptionsClicked = useCallback(() => {
    setExpandAdvancedOptions((prevState) => !prevState);
  }, []);

  return (
    <EuiToolTip position="top" content={tooltipContent}>
      <EuiPopover
        data-test-subj={isTimelineSourcerer ? 'timeline-sourcerer-popover' : 'sourcerer-popover'}
        button={trigger}
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
            {showAlertsOnlyCheckbox && (
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
                placeholder={i18n.PICK_INDEX_PATTERNS}
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
                onChange={onChangeCombo}
                options={selectableOptions}
                placeholder={i18n.PICK_INDEX_PATTERNS}
                renderOption={renderOption}
                selectedOptions={selectedOptions}
                isDisabled={isOnlyDetectionAlerts}
              />
            </FormRow>

            {!isOnlyDetectionAlerts && (
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

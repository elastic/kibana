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
  EuiCheckbox,
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
  &:enabled:focus,
  &:focus {
    background-color: transparent;
  }
`;
interface SourcererComponentProps {
  scope: sourcererModel.SourcererScopeName;
  isTimelineSourcerer?: boolean;
  showAlertsOnlyCheckbox?: boolean;
}

const PopoverContent = styled.div`
  width: 600px;
`;

const StyledBadge = styled(EuiBadge)`
  margin-left: 8px;
`;

const SECURITY_DATA_VIEW_ID = 'detections';

export const Sourcerer = React.memo<SourcererComponentProps>(
  ({ scope: scopeId, isTimelineSourcerer, showAlertsOnlyCheckbox }) => {
    const dispatch = useDispatch();
    const [{ pageName, detailName }] = useRouteSpy();
    const isAlertsOrRulesDetailsPage =
      pageName === SecurityPageName.alerts || (SecurityPageName.rules && detailName != null);

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
    const defaultDataViewByPage = isOnlyDetectionAlerts
      ? SECURITY_DATA_VIEW_ID
      : selectedDataViewId ?? defaultDataView.id;
    const [dataViewId, setDataViewId] = useState<string>(defaultDataViewByPage);

    const { patternList, selectablePatterns } = useMemo(() => {
      if (isOnlyDetectionAlerts && signalIndexName) {
        return {
          patternList: [signalIndexName],
          selectablePatterns: [signalIndexName],
        };
      }
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
    }, [isOnlyDetectionAlerts, kibanaDataViews, signalIndexName, dataViewId]);

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

    const selectableOptions = useMemo(
      () =>
        patternList.map((indexName) => ({
          label: indexName,
          value: indexName,
          disabled: !selectablePatterns.includes(indexName),
        })),
      [patternList, selectablePatterns]
    );

    const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
      isOnlyDetectionAlerts
        ? alertsOptions
        : selectedPatterns.map((indexName) => ({
            label: indexName,
            value: indexName,
          }))
    );

    const getDefaultSelectedOptionsByDataView = useCallback(
      (id: string) =>
        isOnlyDetectionAlerts
          ? alertsOptions
          : getScopePatternListSelection(
              kibanaDataViews.find((dataView) => dataView.id === id),
              scopeId,
              signalIndexName
            ).map((indexSelected: string) => ({
              label: indexSelected,
              value: indexSelected,
            })),
      [alertsOptions, isOnlyDetectionAlerts, kibanaDataViews, scopeId, signalIndexName]
    );

    const defaultSelectedOptions = useMemo(
      () => getDefaultSelectedOptionsByDataView(dataViewId),
      [dataViewId, getDefaultSelectedOptionsByDataView]
    );

    const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);
    const isModified = useMemo(
      () =>
        !defaultSelectedOptions.every((option) =>
          selectedOptions.find((selectedOption) => option.value === selectedOption.value)
        ),
      [defaultSelectedOptions, selectedOptions]
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
        setSelectedOptions(getDefaultSelectedOptionsByDataView(newSelectedOption));
      },
      [getDefaultSelectedOptionsByDataView]
    );

    const resetDataSources = useCallback(() => {
      setDataViewId(defaultDataViewByPage);
      setSelectedOptions(getDefaultSelectedOptionsByDataView(defaultDataViewByPage));
    }, [defaultDataViewByPage, getDefaultSelectedOptionsByDataView]);

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
          aria-label={i18n.DATA_VIEW}
          data-test-subj="sourcerer-trigger"
          flush="left"
          iconSide="right"
          iconType="arrowDown"
          isLoading={loading}
          onClick={setPopoverIsOpenCb}
          title={i18n.DATA_VIEW}
        >
          {i18n.DATA_VIEW}
          {isModified && <StyledBadge>{i18n.MODIFIED_BADGE_TITLE}</StyledBadge>}
          {isOnlyDetectionAlerts && <StyledBadge>{i18n.ALERTS_BADGE_TITLE}</StyledBadge>}
        </StyledButton>
      ),
      [loading, setPopoverIsOpenCb, isModified, isOnlyDetectionAlerts]
    );

    const dataViewSelectOptions = useMemo(
      () =>
        isOnlyDetectionAlerts
          ? [
              {
                inputDisplay: (
                  <span data-test-subj="security-alerts-option-super">
                    <EuiIcon type="logoSecurity" size="s" /> {i18n.SIEM_SECURITY_DATA_VIEW_LABEL}
                    <StyledBadge>{i18n.ALERTS_BADGE_TITLE}</StyledBadge>
                  </span>
                ),
                value: SECURITY_DATA_VIEW_ID,
              },
            ]
          : kibanaDataViews.map(({ title, id }) => ({
              inputDisplay:
                id === defaultDataView.id ? (
                  <span data-test-subj="security-option-super">
                    <EuiIcon type="logoSecurity" size="s" /> {i18n.SECURITY_DEFAULT_DATA_VIEW_LABEL}
                    {isModified && id === dataViewId && (
                      <StyledBadge>{i18n.MODIFIED_BADGE_TITLE}</StyledBadge>
                    )}
                  </span>
                ) : (
                  <span data-test-subj="dataView-option-super">
                    <EuiIcon type="logoKibana" size="s" /> {title}
                  </span>
                ),
              value: id,
            })),
      [dataViewId, defaultDataView.id, isOnlyDetectionAlerts, isModified, kibanaDataViews]
    );

    useEffect(() => {
      setDataViewId((prevSelectedOption) =>
        isOnlyDetectionAlerts
          ? SECURITY_DATA_VIEW_ID
          : selectedDataViewId != null && !deepEqual(selectedDataViewId, prevSelectedOption)
          ? selectedDataViewId
          : prevSelectedOption
      );
    }, [isOnlyDetectionAlerts, selectedDataViewId]);

    useEffect(() => {
      setSelectedOptions(
        isOnlyDetectionAlerts
          ? alertsOptions
          : selectedPatterns.map((indexName) => ({
              label: indexName,
              value: indexName,
            }))
      );
    }, [alertsOptions, isOnlyDetectionAlerts, selectedPatterns]);

    const tooltipContent = useMemo(
      () =>
        isPopoverOpen
          ? null
          : (isOnlyDetectionAlerts
              ? signalIndexName
                ? [signalIndexName]
                : []
              : selectedPatterns
            ).join(', '),
      [isPopoverOpen, isOnlyDetectionAlerts, signalIndexName, selectedPatterns]
    );

    const [expandAdvancedOptions, setExpandAdvancedOptions] = useState(false);

    const onExpandAdvancedOptionsClicked = useCallback(() => {
      setExpandAdvancedOptions((prevState) => !prevState);
    }, []);

    return (
      <EuiToolTip position="top" content={tooltipContent}>
        <EuiPopover
          data-test-subj="sourcerer-popover"
          button={trigger}
          isOpen={isPopoverOpen}
          closePopover={handleClosePopOver}
          display="block"
          repositionOnScroll
          ownFocus
        >
          <PopoverContent>
            <EuiPopoverTitle>
              <>{i18n.SELECT_DATA_VIEW}</>
            </EuiPopoverTitle>
            {isOnlyDetectionAlerts && (
              <EuiCallOut
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
                    id="timeline-sourcerer-checkbox"
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
  }
);
Sourcerer.displayName = 'Sourcerer';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiRadioGroup,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiHealth,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiSuperSelect,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { sourcererSelectors } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { TimelineEventsType } from '../../../../../common';
import * as i18n from './translations';
import { getScopePatternListSelection } from '../../../../common/store/sourcerer/helpers';
import { SIEM_DATA_VIEW_LABEL } from '../../../../common/components/sourcerer/translations';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

const PopoverContent = styled.div`
  width: 600px;
`;

const ResetButton = styled(EuiButtonEmpty)`
  width: fit-content;
`;

const MyEuiButton = styled(EuiButton)`
  .euiHealth {
    vertical-align: middle;
  }
`;

const AllEuiHealth = styled(EuiHealth)`
  margin-left: -2px;
  svg {
    stroke: #fff;
    stroke-width: 1px;
    stroke-linejoin: round;
    width: 19px;
    height: 19px;
    margin-top: 1px;
    z-index: 1;
  }
`;

const WarningEuiHealth = styled(EuiHealth)`
  margin-left: -17px;
  svg {
    z-index: 0;
  }
`;

const AdvancedSettings = styled(EuiText)`
  color: ${({ theme }) => theme.eui.euiColorPrimary};
`;

const ConfigHelper = styled(EuiText)`
  margin-left: 4px;
`;

const Filter = styled(EuiRadioGroup)`
  margin-left: 4px;
`;

const PickEventContainer = styled.div`
  .euiSuperSelect {
    width: 170px;
    max-width: 170px;
    button.euiSuperSelectControl {
      padding-top: 3px;
    }
  }
`;

const getEventTypeOptions = (isCustomDisabled: boolean = true, isDefaultPattern: boolean) => [
  {
    id: 'all',
    label: (
      <AllEuiHealth color="subdued">
        <WarningEuiHealth color="warning">{i18n.ALL_EVENT}</WarningEuiHealth>
      </AllEuiHealth>
    ),
  },
  {
    id: 'raw',
    label: <EuiHealth color="subdued"> {i18n.RAW_EVENT}</EuiHealth>,
    disabled: !isDefaultPattern,
  },
  {
    id: 'alert',
    label: <EuiHealth color="warning"> {i18n.DETECTION_ALERTS_EVENT}</EuiHealth>,
    disabled: !isDefaultPattern,
  },
  {
    id: 'custom',
    label: <>{i18n.CUSTOM_INDEX_PATTERNS}</>,
    disabled: isCustomDisabled,
  },
];

interface PickEventTypeProps {
  eventType: TimelineEventsType;
  onChangeEventTypeAndIndexesName: (
    value: TimelineEventsType,
    indexNames: string[],
    dataViewId: string
  ) => void;
}

// AKA TimelineSourcerer
const PickEventTypeComponents: React.FC<PickEventTypeProps> = ({
  eventType = 'all',
  onChangeEventTypeAndIndexesName,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [showAdvanceSettings, setAdvanceSettings] = useState(eventType === 'custom');
  const [filterEventType, setFilterEventType] = useState<TimelineEventsType>(eventType);
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const {
    defaultDataView,
    kibanaDataViews,
    signalIndexName,
    sourcererScope: { loading, selectedPatterns, selectedDataViewId },
  }: sourcererSelectors.SourcererScopeSelector = useDeepEqualSelector((state) =>
    sourcererScopeSelector(state, SourcererScopeName.timeline)
  );

  const [dataViewId, setDataViewId] = useState<string>(selectedDataViewId ?? '');
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
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    selectedPatterns.map((indexName) => ({
      label: indexName,
      value: indexName,
    }))
  );
  const isSavingDisabled = useMemo(() => selectedOptions.length === 0, [selectedOptions]);
  const selectableOptions = useMemo(
    () =>
      patternList.map((indexName) => ({
        label: indexName,
        value: indexName,
        'data-test-subj': 'sourcerer-option',
        disabled: !selectablePatterns.includes(indexName),
      })),
    [selectablePatterns, patternList]
  );

  const onChangeFilter = useCallback(
    (filter) => {
      setFilterEventType(filter);
      if (filter === 'all' || filter === 'kibana') {
        setSelectedOptions(
          selectablePatterns.map((indexSelected) => ({
            label: indexSelected,
            value: indexSelected,
          }))
        );
      } else if (filter === 'raw') {
        setSelectedOptions(
          (signalIndexName == null
            ? selectablePatterns
            : selectablePatterns.filter((index) => index !== signalIndexName)
          ).map((indexSelected) => ({
            label: indexSelected,
            value: indexSelected,
          }))
        );
      } else if (filter === 'alert') {
        setSelectedOptions([
          {
            label: signalIndexName ?? '',
            value: signalIndexName ?? '',
          },
        ]);
      }
    },
    [selectablePatterns, signalIndexName]
  );

  const onChangeCombo = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const localSelectedPatterns = newSelectedOptions
        .map((nso) => nso.label)
        .sort()
        .join();
      if (localSelectedPatterns === selectablePatterns.sort().join()) {
        setFilterEventType('all');
      } else if (
        dataViewId === defaultDataView.id &&
        localSelectedPatterns ===
          selectablePatterns
            .filter((index) => index !== signalIndexName)
            .sort()
            .join()
      ) {
        setFilterEventType('raw');
      } else if (dataViewId === defaultDataView.id && localSelectedPatterns === signalIndexName) {
        setFilterEventType('alert');
      } else {
        setFilterEventType('custom');
      }

      setSelectedOptions(newSelectedOptions);
    },
    [defaultDataView.id, dataViewId, selectablePatterns, signalIndexName]
  );

  const onChangeSuper = useCallback(
    (newSelectedOption) => {
      setFilterEventType('all');
      setDataViewId(newSelectedOption);
      setSelectedOptions(
        getScopePatternListSelection(
          kibanaDataViews.find((dataView) => dataView.id === newSelectedOption),
          SourcererScopeName.timeline,
          signalIndexName,
          newSelectedOption === defaultDataView.id
        ).map((indexSelected: string) => ({
          label: indexSelected,
          value: indexSelected,
        }))
      );
    },
    [defaultDataView.id, kibanaDataViews, signalIndexName]
  );

  const togglePopover = useCallback(
    () => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen),
    []
  );

  const closePopover = useCallback(() => setPopover(false), []);

  const handleSaveIndices = useCallback(() => {
    onChangeEventTypeAndIndexesName(
      filterEventType,
      selectedOptions.map((so) => so.label),
      dataViewId
    );
    setPopover(false);
  }, [dataViewId, filterEventType, onChangeEventTypeAndIndexesName, selectedOptions]);

  const resetDataSources = useCallback(() => {
    setDataViewId(defaultDataView.id);
    setSelectedOptions(
      getScopePatternListSelection(
        defaultDataView,
        SourcererScopeName.timeline,
        signalIndexName,
        true
      ).map((indexSelected: string) => ({
        label: indexSelected,
        value: indexSelected,
      }))
    );
    setFilterEventType(eventType);
  }, [defaultDataView, eventType, signalIndexName]);

  const dataViewSelectOptions = useMemo(
    () =>
      kibanaDataViews.map(({ title, id }) => ({
        inputDisplay:
          id === defaultDataView.id ? (
            <span data-test-subj="dataView-option-super">
              <EuiIcon type="logoSecurity" size="s" /> {SIEM_DATA_VIEW_LABEL}
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

  const filterOptions = useMemo(
    () => getEventTypeOptions(filterEventType !== 'custom', dataViewId === defaultDataView.id),
    [defaultDataView.id, filterEventType, dataViewId]
  );

  const button = useMemo(() => {
    const options = getEventTypeOptions(true, dataViewId === defaultDataView.id);
    return (
      <MyEuiButton
        data-test-subj="sourcerer-timeline-trigger"
        iconType="arrowDown"
        iconSide="right"
        isLoading={loading}
        onClick={togglePopover}
      >
        {options.find((opt) => opt.id === eventType)?.label}
      </MyEuiButton>
    );
  }, [defaultDataView.id, eventType, dataViewId, loading, togglePopover]);

  const tooltipContent = useMemo(
    () => (isPopoverOpen ? null : selectedPatterns.sort().join(', ')),
    [isPopoverOpen, selectedPatterns]
  );

  const buttonWithTooptip = useMemo(() => {
    return tooltipContent ? (
      <EuiToolTip
        position="top"
        content={tooltipContent}
        data-test-subj="timeline-sourcerer-tooltip"
      >
        {button}
      </EuiToolTip>
    ) : (
      button
    );
  }, [button, tooltipContent]);

  const ButtonContent = useMemo(
    () => (
      <AdvancedSettings data-test-subj="advanced-settings">
        {showAdvanceSettings
          ? i18n.HIDE_INDEX_PATTERNS_ADVANCED_SETTINGS
          : i18n.SHOW_INDEX_PATTERNS_ADVANCED_SETTINGS}
      </AdvancedSettings>
    ),
    [showAdvanceSettings]
  );

  useEffect(() => {
    const newSelectedOptions = selectedPatterns.map((indexSelected) => ({
      label: indexSelected,
      value: indexSelected,
    }));
    setSelectedOptions((prevSelectedOptions) => {
      if (!deepEqual(newSelectedOptions, prevSelectedOptions)) {
        return newSelectedOptions;
      }
      return prevSelectedOptions;
    });
  }, [selectedPatterns]);

  useEffect(() => {
    setFilterEventType((prevFilter) => (prevFilter !== eventType ? eventType : prevFilter));
    setAdvanceSettings(eventType === 'custom');
  }, [eventType]);

  return (
    <PickEventContainer>
      <EuiPopover
        button={buttonWithTooptip}
        closePopover={closePopover}
        id="popover"
        isOpen={isPopoverOpen}
        repositionOnScroll
      >
        <PopoverContent>
          <EuiPopoverTitle>
            <>{i18n.SELECT_INDEX_PATTERNS}</>
          </EuiPopoverTitle>
          <EuiSpacer size="s" />
          <Filter
            data-test-subj="timeline-sourcerer-radio"
            options={filterOptions}
            idSelected={filterEventType}
            onChange={onChangeFilter}
            name={i18n.SELECT_INDEX_PATTERNS}
          />
          <EuiSpacer size="m" />
          <EuiAccordion
            data-test-subj="sourcerer-accordion"
            id="accordion1"
            forceState={showAdvanceSettings ? 'open' : 'closed'}
            buttonContent={ButtonContent}
            onToggle={setAdvanceSettings}
          >
            <>
              <EuiSpacer size="s" />
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
                data-test-subj="timeline-sourcerer"
                fullWidth
                onChange={onChangeCombo}
                options={selectableOptions}
                placeholder={i18n.PICK_INDEX_PATTERNS}
                selectedOptions={selectedOptions}
              />
            </>
          </EuiAccordion>
          {!showAdvanceSettings && (
            <>
              <EuiSpacer size="s" />
              <ConfigHelper size="s" color="subdued">
                {i18n.CONFIGURE_INDEX_PATTERNS}
              </ConfigHelper>
            </>
          )}
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <ResetButton
                aria-label={i18n.DATA_SOURCES_RESET}
                data-test-subj="sourcerer-reset"
                flush="left"
                onClick={resetDataSources}
                title={i18n.DATA_SOURCES_RESET}
              >
                {i18n.DATA_SOURCES_RESET}
              </ResetButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleSaveIndices}
                data-test-subj="sourcerer-save"
                disabled={isSavingDisabled}
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
    </PickEventContainer>
  );
};

export const PickEventType = memo(PickEventTypeComponents);

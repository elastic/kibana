/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

import { State } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { TimelineEventsType } from '../../../../../common/types/timeline';
import { getSourcererScopeSelector, SourcererScopeSelector } from './selectors';
import * as i18n from './translations';

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

const getEventTypeOptions = (isCustomDisabled: boolean = true) => [
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
  },
  {
    id: 'alert',
    label: <EuiHealth color="warning"> {i18n.DETECTION_ALERTS_EVENT}</EuiHealth>,
  },
  {
    id: 'custom',
    label: <>{i18n.CUSTOM_INDEX_PATTERNS}</>,
    disabled: isCustomDisabled,
  },
];

interface PickEventTypeProps {
  eventType: TimelineEventsType;
  onChangeEventTypeAndIndexesName: (value: TimelineEventsType, indexNames: string[]) => void;
}

const PickEventTypeComponents: React.FC<PickEventTypeProps> = ({
  eventType = 'all',
  onChangeEventTypeAndIndexesName,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [showAdvanceSettings, setAdvanceSettings] = useState(eventType === 'custom');
  const [filterEventType, setFilterEventType] = useState<TimelineEventsType>(eventType);
  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { configIndexPatterns, kibanaIndexPatterns, signalIndexName, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, SourcererScopeName.timeline), deepEqual);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    sourcererScope.selectedPatterns.map((indexSelected) => ({
      label: indexSelected,
      value: indexSelected,
    }))
  );

  const indexesPatternOptions = useMemo(
    () =>
      [
        ...configIndexPatterns,
        ...kibanaIndexPatterns.map((kip) => kip.title),
        signalIndexName,
      ].reduce<Array<EuiComboBoxOptionOption<string>>>((acc, index) => {
        if (index != null && !acc.some((o) => o.label.includes(index))) {
          return [...acc, { label: index, value: index }];
        }
        return acc;
      }, []),
    [configIndexPatterns, kibanaIndexPatterns, signalIndexName]
  );

  const renderOption = useCallback(
    (option) => {
      const { value } = option;
      if (kibanaIndexPatterns.some((kip) => kip.title === value)) {
        return (
          <>
            <EuiIcon type="logoKibana" size="s" /> {value}
          </>
        );
      }
      return <>{value}</>;
    },
    [kibanaIndexPatterns]
  );

  const onChangeCombo = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const localSelectedPatterns = newSelectedOptions.map((nso) => nso.label);
      if (
        localSelectedPatterns.sort().join() ===
        [...configIndexPatterns, signalIndexName].sort().join()
      ) {
        setFilterEventType('all');
      } else if (localSelectedPatterns.sort().join() === configIndexPatterns.sort().join()) {
        setFilterEventType('raw');
      } else if (localSelectedPatterns.sort().join() === signalIndexName) {
        setFilterEventType('alert');
      } else {
        setFilterEventType('custom');
      }

      setSelectedOptions(newSelectedOptions);
    },
    [configIndexPatterns, signalIndexName]
  );

  const onChangeFilter = useCallback(
    (filter) => {
      setFilterEventType(filter);
      if (filter === 'all') {
        setSelectedOptions(
          [...configIndexPatterns, signalIndexName ?? ''].map((indexSelected) => ({
            label: indexSelected,
            value: indexSelected,
          }))
        );
      } else if (filter === 'raw') {
        setSelectedOptions(
          configIndexPatterns.map((indexSelected) => ({
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
      } else if (filter === 'kibana') {
        setSelectedOptions(
          kibanaIndexPatterns.map((kip) => ({
            label: kip.title,
            value: kip.title,
          }))
        );
      }
    },
    [configIndexPatterns, kibanaIndexPatterns, signalIndexName]
  );

  const togglePopover = useCallback(
    () => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen),
    []
  );

  const closePopover = useCallback(() => setPopover(false), []);

  const handleSaveIndices = useCallback(() => {
    onChangeEventTypeAndIndexesName(
      filterEventType,
      selectedOptions.map((so) => so.label)
    );
    setPopover(false);
  }, [filterEventType, onChangeEventTypeAndIndexesName, selectedOptions]);

  const resetDataSources = useCallback(() => {
    setSelectedOptions(
      sourcererScope.selectedPatterns.map((indexSelected) => ({
        label: indexSelected,
        value: indexSelected,
      }))
    );
    setFilterEventType(eventType);
  }, [eventType, sourcererScope.selectedPatterns]);

  const comboBox = useMemo(
    () => (
      <EuiComboBox
        placeholder={i18n.PICK_INDEX_PATTERNS}
        fullWidth
        options={indexesPatternOptions}
        selectedOptions={selectedOptions}
        onChange={onChangeCombo}
        renderOption={renderOption}
      />
    ),
    [onChangeCombo, indexesPatternOptions, renderOption, selectedOptions]
  );

  const filterOptions = useMemo(() => getEventTypeOptions(filterEventType !== 'custom'), [
    filterEventType,
  ]);

  const filter = useMemo(
    () => (
      <Filter
        options={filterOptions}
        idSelected={filterEventType}
        onChange={onChangeFilter}
        name={i18n.SELECT_INDEX_PATTERNS}
      />
    ),
    [filterEventType, filterOptions, onChangeFilter]
  );

  const button = useMemo(() => {
    const options = getEventTypeOptions();
    return (
      <MyEuiButton
        iconType="arrowDown"
        iconSide="right"
        isLoading={sourcererScope.loading}
        onClick={togglePopover}
      >
        {options.find((opt) => opt.id === eventType)?.label}
      </MyEuiButton>
    );
  }, [eventType, sourcererScope.loading, togglePopover]);

  const tooltipContent = useMemo(
    () => (isPopoverOpen ? null : sourcererScope.selectedPatterns.sort().join(', ')),
    [isPopoverOpen, sourcererScope.selectedPatterns]
  );

  const ButtonContent = useMemo(
    () => (
      <AdvancedSettings>
        {showAdvanceSettings
          ? i18n.HIDE_INDEX_PATTERNS_ADVANCED_SETTINGS
          : i18n.SHOW_INDEX_PATTERNS_ADVANCED_SETTINGS}
      </AdvancedSettings>
    ),
    [showAdvanceSettings]
  );

  useEffect(() => {
    const newSelectedOptions = sourcererScope.selectedPatterns.map((indexSelected) => ({
      label: indexSelected,
      value: indexSelected,
    }));
    setSelectedOptions((prevSelectedOptions) => {
      if (!deepEqual(newSelectedOptions, prevSelectedOptions)) {
        return newSelectedOptions;
      }
      return prevSelectedOptions;
    });
  }, [sourcererScope.selectedPatterns]);

  useEffect(() => {
    setFilterEventType((prevFilter) => (prevFilter !== eventType ? eventType : prevFilter));
    setAdvanceSettings(eventType === 'custom');
  }, [eventType]);

  return (
    <PickEventContainer>
      <EuiToolTip position="top" content={tooltipContent}>
        <EuiPopover
          id="popover"
          ownFocus
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          repositionOnScroll
        >
          <PopoverContent>
            <EuiPopoverTitle>
              <>{i18n.SELECT_INDEX_PATTERNS}</>
            </EuiPopoverTitle>
            <EuiSpacer size="s" />
            {filter}
            <EuiSpacer size="m" />
            <EuiAccordion
              id="accordion1"
              forceState={showAdvanceSettings ? 'open' : 'closed'}
              buttonContent={ButtonContent}
              onToggle={setAdvanceSettings}
            >
              <>
                <EuiSpacer size="s" />
                {comboBox}
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
                  size="l"
                  title={i18n.DATA_SOURCES_RESET}
                >
                  {i18n.DATA_SOURCES_RESET}
                </ResetButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={handleSaveIndices}
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
    </PickEventContainer>
  );
};

export const PickEventType = memo(PickEventTypeComponents);

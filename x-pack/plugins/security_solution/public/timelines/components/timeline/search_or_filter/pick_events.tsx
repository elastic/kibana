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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiPopoverFooter,
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
import {
  SelectablePatterns,
  SourcererPatternType,
} from '../../../../../common/search_strategy/index_fields';
import {
  filterKipAsSoloPattern,
  getPatternColor,
  renderPatternOption,
} from '../../../../common/components/sourcerer/helpers';
import { ColorKey } from '../../../../common/components/sourcerer/color_key';

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
  onChangeEventTypeAndSelectedPatterns: (
    value: TimelineEventsType,
    selectedPatterns: SelectablePatterns
  ) => void;
}

type ComboOptions = Array<EuiComboBoxOptionOption<string> & { value: string }>;

const PickEventTypeComponents: React.FC<PickEventTypeProps> = ({
  eventType = 'all',
  onChangeEventTypeAndSelectedPatterns,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [showAdvanceSettings, setAdvanceSettings] = useState(eventType === 'custom');
  const [filterEventType, setFilterEventType] = useState<TimelineEventsType>(eventType);
  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { configIndexPatterns, kibanaIndexPatterns, signalIndexName, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, SourcererScopeName.timeline), deepEqual);
  const [selectedOptions, setSelectedOptions] = useState<ComboOptions>(
    sourcererScope.selectedPatterns.map(({ title: indexSelected, id }, i) => ({
      color: getPatternColor(id),
      key: id === SourcererPatternType.detections ? id : `${id}-${i}`,
      label: indexSelected,
      value: id,
    }))
  );
  const configAsSelectable: SelectablePatterns = useMemo(
    () => configIndexPatterns.map((title) => ({ title, id: SourcererPatternType.config })),
    [configIndexPatterns]
  );

  const indexesPatternOptions: ComboOptions = useMemo(
    () =>
      [
        ...configAsSelectable,
        { title: signalIndexName, id: SourcererPatternType.detections },
        ...kibanaIndexPatterns,
      ].reduce<ComboOptions>((acc, { title: index, id }, i) => {
        if (index != null) {
          return [
            ...acc,
            {
              color: getPatternColor(id),
              key: id === SourcererPatternType.detections ? id : `${id}-${i}`,
              label: index,
              value: id,
            },
          ];
        }
        return acc;
      }, []),
    [configAsSelectable, kibanaIndexPatterns, signalIndexName]
  );
  const onChangeCombo = useCallback(
    (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const filteredOptions = filterKipAsSoloPattern(selectedOptions, newSelectedOptions);
      const localSelectedPatterns = filteredOptions.map((nso) => nso.label);
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

      setSelectedOptions(filteredOptions as ComboOptions);
    },
    [configIndexPatterns, selectedOptions, signalIndexName]
  );

  const onChangeFilter = useCallback(
    (filter) => {
      setFilterEventType(filter);
      if (filter === 'all') {
        setSelectedOptions(
          [
            ...configAsSelectable,
            { title: signalIndexName ?? '', id: SourcererPatternType.detections },
          ].map(({ title: indexSelected, id }, i) => ({
            label: indexSelected,
            color: getPatternColor(id),
            value: id,
            key: id === SourcererPatternType.detections ? id : `${id}-${i}`,
          }))
        );
      } else if (filter === 'raw') {
        setSelectedOptions(
          configAsSelectable.map(({ title: indexSelected, id }, i) => ({
            label: indexSelected,
            color: getPatternColor(id),
            value: id,
            key: `${id}-${i}`,
          }))
        );
      } else if (filter === 'alert') {
        setSelectedOptions([
          {
            label: signalIndexName ?? '',
            color: getPatternColor(SourcererPatternType.detections),
            value: SourcererPatternType.detections,
            key: SourcererPatternType.detections,
          },
        ]);
      } else if (filter === 'kibana') {
        setSelectedOptions(
          kibanaIndexPatterns.map(({ title, id }, i) => ({
            label: title,
            color: getPatternColor(id),
            value: id,
            key: `${id}-${i}`,
          }))
        );
      }
    },
    [configAsSelectable, kibanaIndexPatterns, signalIndexName]
  );

  const togglePopover = useCallback(
    () => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen),
    []
  );

  const closePopover = useCallback(() => setPopover(false), []);

  const handleSaveIndices = useCallback(() => {
    onChangeEventTypeAndSelectedPatterns(
      filterEventType,
      selectedOptions.map((so) => ({ title: so.label, id: so.value }))
    );
    setPopover(false);
  }, [filterEventType, onChangeEventTypeAndSelectedPatterns, selectedOptions]);

  const resetDataSources = useCallback(() => {
    setSelectedOptions(
      sourcererScope.selectedPatterns.map(({ title: indexSelected, id }, i) => ({
        label: indexSelected,
        color: getPatternColor(id),
        value: id,
        key: id === SourcererPatternType.detections ? id : `${id}-${i}`,
      }))
    );
    setFilterEventType(eventType);
  }, [eventType, sourcererScope.selectedPatterns]);

  const comboBox = useMemo(() => {
    return (
      <EuiComboBox
        data-test-subj="timeline-sourcerer"
        fullWidth
        onChange={onChangeCombo}
        options={indexesPatternOptions}
        placeholder={i18n.PICK_INDEX_PATTERNS}
        renderOption={renderPatternOption}
        selectedOptions={selectedOptions}
      />
    );
  }, [onChangeCombo, indexesPatternOptions, selectedOptions]);

  const filterOptions = useMemo(() => getEventTypeOptions(filterEventType !== 'custom'), [
    filterEventType,
  ]);

  const filter = useMemo(
    () => (
      <Filter
        data-test-subj="timeline-sourcerer-radio"
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
        data-test-subj="sourcerer-timeline-trigger"
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
    () => (isPopoverOpen ? null : sourcererScope.indexNames.sort().join(', ')),
    [isPopoverOpen, sourcererScope.indexNames]
  );

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
    const newSelectedOptions = sourcererScope.selectedPatterns.map(
      ({ title: indexSelected, id }, i) => ({
        label: indexSelected,
        color: getPatternColor(id),
        value: id,
        key: id === SourcererPatternType.detections ? id : `${id}-${i}`,
      })
    );
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
          button={button}
          closePopover={closePopover}
          id="popover"
          isOpen={isPopoverOpen}
          ownFocus
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
                <EuiSpacer size="s" />
                <ColorKey includeDetections />
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
            <EuiPopoverFooter>
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
            </EuiPopoverFooter>
          </PopoverContent>
        </EuiPopover>
      </EuiToolTip>
    </PickEventContainer>
  );
};

export const PickEventType = memo(PickEventTypeComponents);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiHealth,
  EuiIcon,
  EuiIconTip,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import debounce from 'lodash/debounce';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

import { State } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { EventType } from '../../../../timelines/store/timeline/model';
import { getSourcererScopeSelector, SourcererScopeSelector } from './selectors';
import * as i18n from './translations';

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

const FilterGroup = styled(EuiButtonGroup)`
  .euiHealth {
    display: flex;
  }
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

const toggleEventType = [
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
    id: 'kibana',
    label: (
      <>
        <EuiIcon type="logoKibana" size="s" /> {i18n.KIBANA_INDEX_PATTERNS}
      </>
    ),
  },
];

interface PickEventTypeProps {
  eventType: EventType;
  onChangeEventTypeAndIndexesName: (value: EventType, indexNames: string[]) => void;
}

const PickEventTypeComponents: React.FC<PickEventTypeProps> = ({
  eventType = 'all',
  onChangeEventTypeAndIndexesName,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [filterEventType, setFilterEventType] = useState<EventType>(eventType);
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

  const onChangeCombo = useCallback((newSelectedOptions) => {
    setFilterEventType('custom');
    setSelectedOptions(newSelectedOptions);
  }, []);

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

  const comboBox = useMemo(
    () => (
      <EuiComboBox
        placeholder="Pick index patterns"
        fullWidth
        options={indexesPatternOptions}
        selectedOptions={selectedOptions}
        onChange={debounce(onChangeCombo, 600, {
          leading: true,
          trailing: false,
        })}
        renderOption={renderOption}
      />
    ),
    [indexesPatternOptions, onChangeCombo, renderOption, selectedOptions]
  );

  const filter = useMemo(
    () => (
      <FilterGroup
        options={toggleEventType}
        idSelected={filterEventType}
        onChange={onChangeFilter}
        buttonSize="compressed"
        isFullWidth
      />
    ),
    [filterEventType, onChangeFilter]
  );

  const button = useMemo(
    () => (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        isLoading={sourcererScope.loading}
        onClick={togglePopover}
      >
        {i18n.KIBANA_INDEX_PATTERNS}
      </EuiButton>
    ),
    [sourcererScope.loading, togglePopover]
  );

  useEffect(() => {
    const newSelecteOptions = sourcererScope.selectedPatterns.map((indexSelected) => ({
      label: indexSelected,
      value: indexSelected,
    }));
    setSelectedOptions((prevSelectedOptions) => {
      if (!deepEqual(newSelecteOptions, prevSelectedOptions)) {
        return newSelecteOptions;
      }
      return prevSelectedOptions;
    });
  }, [sourcererScope.selectedPatterns]);

  useEffect(() => {
    setFilterEventType((prevFilter) => (prevFilter !== eventType ? eventType : prevFilter));
  }, [eventType]);

  return (
    <PickEventContainer>
      <EuiToolTip
        position="top"
        content={selectedOptions
          .map((so) => so.label)
          .sort()
          .join(', ')}
      >
        <EuiPopover
          id="popover"
          ownFocus
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
        >
          <div style={{ width: '600px' }}>
            <EuiPopoverTitle>
              <>
                {i18n.SELECT_INDEX_PATTERNS}
                <EuiIconTip position="right" content={i18n.CONFIGURE_INDEX_PATTERNS} />
              </>
            </EuiPopoverTitle>
            {filter}
            <EuiSpacer size="s" />
            {comboBox}
            <EuiSpacer size="s" />
            <EuiPopoverFooter>
              <EuiButton
                onClick={handleSaveIndices}
                data-test-subj="add-index"
                fill
                fullWidth
                size="s"
              >
                {i18n.SAVE_INDEX_PATTERNS}
              </EuiButton>
            </EuiPopoverFooter>
          </div>
        </EuiPopover>
      </EuiToolTip>
    </PickEventContainer>
  );
};

export const PickEventType = memo(PickEventTypeComponents);

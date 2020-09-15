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
  EuiPopover,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const PickEventContainer = styled.div`
  .euiSuperSelect {
    width: 170px;
    max-width: 170px;
    button.euiSuperSelectControl {
      padding-top: 3px;
    }
  }
`;

export const eventTypeOptions: EuiComboBoxOptionOption = {
  label: 'filters',
  options: [
    {
      label: 'all',
      value: 'all',
    },
    {
      label: 'raw',
      value: 'raw',
    },
    {
      label: 'alert',
      value: 'alert',
    },
  ],
};

const toggleEventType = [
  {
    id: 'all',
    label: i18n.ALL_EVENT,
  },
  {
    id: 'raw',
    label: i18n.RAW_EVENT,
  },
  {
    id: 'alert',
    label: i18n.DETECTION_ALERTS_EVENT,
  },
];

interface PickEventTypeProps {
  eventType: EventType;
  onChangeEventTypeAndIndexesName: (value: EventType, indexesName: string[]) => void;
}

const PickEventTypeComponents: React.FC<PickEventTypeProps> = ({
  eventType = 'all',
  onChangeEventTypeAndIndexesName,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { allExistingIndexPatterns, signalIndexName, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, SourcererScopeName.timeline), deepEqual);

  const indexesPatternOptions = useMemo(
    () =>
      [...allExistingIndexPatterns, signalIndexName].reduce<Array<EuiComboBoxOptionOption<string>>>(
        (acc, index) => {
          if (index != null) {
            return [...acc, { label: index, value: index }];
          }
          return acc;
        },
        []
      ),
    [allExistingIndexPatterns, signalIndexName]
  );

  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return sourcererScope.selectedPatterns.map((indexSelected) => ({
      label: indexSelected,
      value: indexSelected,
    }));
  }, [sourcererScope.selectedPatterns]);

  const renderOption = useCallback(
    (option) => {
      const { value } = option;
      if (value === 'all') {
        return (
          <>
            {eventType === 'all' && <EuiIcon type="check" />}{' '}
            <AllEuiHealth color="subdued">
              <WarningEuiHealth color="warning">{i18n.ALL_EVENT}</WarningEuiHealth>
            </AllEuiHealth>
          </>
        );
      } else if (value === 'raw') {
        return (
          <>
            {eventType === 'raw' && <EuiIcon type="check" />}{' '}
            <EuiHealth color="subdued"> {i18n.RAW_EVENT}</EuiHealth>
          </>
        );
      } else if (value === 'alert' || value === 'signal') {
        return (
          <>
            {eventType === 'alert' && <EuiIcon type="check" />}{' '}
            <EuiHealth color="warning"> {i18n.DETECTION_ALERTS_EVENT}</EuiHealth>
          </>
        );
      } else {
        return <>{value}</>;
      }
    },
    [eventType]
  );

  const onChangeCombo = useCallback(
    (newSelectedOptions) => {
      onChangeEventTypeAndIndexesName(
        'custom',
        newSelectedOptions.map((so: { value: string }) => so.value)
      );
    },
    [onChangeEventTypeAndIndexesName]
  );

  const onChangeFilter = useCallback(
    (filter) => {
      if (filter === 'all') {
        onChangeEventTypeAndIndexesName('all', [
          ...allExistingIndexPatterns,
          signalIndexName ?? '',
        ]);
      } else if (filter === 'raw') {
        onChangeEventTypeAndIndexesName('raw', allExistingIndexPatterns);
      } else if (filter === 'alert') {
        onChangeEventTypeAndIndexesName('alert', [signalIndexName ?? '']);
      }
    },
    [allExistingIndexPatterns, signalIndexName, onChangeEventTypeAndIndexesName]
  );

  const togglePopover = useCallback(
    () => setPopover((prevIsPopoverOpen) => !prevIsPopoverOpen),
    []
  );

  const closePopover = useCallback(() => setPopover(false), []);

  const comboBox = useMemo(
    () => (
      <EuiComboBox
        placeholder="Pick events or index patterns"
        options={indexesPatternOptions}
        selectedOptions={selectedOptions}
        onChange={onChangeCombo}
        renderOption={renderOption}
      />
    ),
    [indexesPatternOptions, onChangeCombo, renderOption, selectedOptions]
  );

  const filter = useMemo(
    () => (
      <EuiButtonGroup
        options={toggleEventType}
        idSelected={eventType}
        onChange={onChangeFilter}
        buttonSize="compressed"
        isFullWidth
      />
    ),
    [eventType, onChangeFilter]
  );

  // TODO translation
  const button = useMemo(
    () => (
      <EuiButton iconType="arrowDown" iconSide="right" onClick={togglePopover}>
        indexes
      </EuiButton>
    ),
    [togglePopover]
  );

  // TODO find a better way to manage the old timeline
  useEffect(() => {
    onChangeFilter(eventType);
  }, []);

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
          <div style={{ width: '400px' }}>
            {filter}
            <EuiSpacer size="s" />
            {comboBox}
          </div>
        </EuiPopover>
      </EuiToolTip>
    </PickEventContainer>
  );
};

export const PickEventType = memo(PickEventTypeComponents);

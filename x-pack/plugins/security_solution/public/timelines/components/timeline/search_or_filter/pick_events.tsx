/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiHealth,
  EuiIcon,
  EuiPopover,
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

interface PickEventTypeProps {
  eventType: EventType;
  onChangeEventType: (value: EventType) => void;
}

const PickEventTypeComponents: React.FC<PickEventTypeProps> = ({
  eventType,
  onChangeEventType,
}) => {
  const comboboxRef = useRef<EuiComboBox<string>>();
  const [isPopoverOpen, setPopover] = useState(false);
  const [allOptions, setAllOptions] = useState<EuiComboBoxOptionOption[]>([eventTypeOptions]);
  const [filter, setFilter] = useState<'all' | 'raw' | 'signal' | 'alert' | 'none'>(eventType);
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>([]);

  const sourcererScopeSelector = useMemo(getSourcererScopeSelector, []);
  const { allExistingIndexPatterns, signalIndexName, sourcererScope } = useSelector<
    State,
    SourcererScopeSelector
  >((state) => sourcererScopeSelector(state, SourcererScopeName.timeline), deepEqual);

  const indexesPatternOptions = useMemo(
    () =>
      [...allExistingIndexPatterns, signalIndexName].reduce<EuiComboBoxOptionOption<string>>(
        (acc, index) => {
          if (index != null) {
            return {
              ...acc,
              options: [...(acc.options ?? []), { label: index, value: index }],
            };
          }
          return acc;
        },
        { label: 'indexes', options: [] }
      ),
    [allExistingIndexPatterns, signalIndexName]
  );

  const renderOption = useCallback(
    (option) => {
      const { value } = option;
      if (value === 'all') {
        return (
          <>
            {filter === 'all' && <EuiIcon type="check" />}{' '}
            <AllEuiHealth color="subdued">
              <WarningEuiHealth color="warning">{i18n.ALL_EVENT}</WarningEuiHealth>
            </AllEuiHealth>
          </>
        );
      } else if (value === 'raw') {
        return (
          <>
            {filter === 'raw' && <EuiIcon type="check" />}{' '}
            <EuiHealth color="subdued"> {i18n.RAW_EVENT}</EuiHealth>
          </>
        );
      } else if (value === 'alert' || value === 'signal') {
        return (
          <>
            {filter === 'alert' && <EuiIcon type="check" />}{' '}
            <EuiHealth color="warning"> {i18n.DETECTION_ALERTS_EVENT}</EuiHealth>
          </>
        );
      } else {
        return <>{value}</>;
      }
    },
    [filter]
  );

  const onChange = useCallback(
    (newSelectedOptions) => {
      setSelectedOptions((prevSelectedOptions) => {
        let filterValues: string[] = [];
        if (newSelectedOptions.some((so: { value: string }) => so.value === 'all')) {
          filterValues = [...allExistingIndexPatterns, signalIndexName ?? ''];
          setFilter('all');
        } else if (newSelectedOptions.some((so: { value: string }) => so.value === 'raw')) {
          filterValues = allExistingIndexPatterns;
          setFilter('raw');
        } else if (newSelectedOptions.some((so: { value: string }) => so.value === 'alert')) {
          filterValues = [signalIndexName ?? ''];
          setFilter('alert');
        }
        if (filterValues.length > 0) {
          return filterValues
            .filter((fv) => fv !== '')
            .reduce<Array<EuiComboBoxOptionOption<string>>>(
              (acc, index) => [...acc, { label: index, value: index }],
              []
            );
        }
        setFilter('none');
        return newSelectedOptions;
      });
    },
    [allExistingIndexPatterns, signalIndexName]
  );

  const togglePopover = useCallback(
    () =>
      setPopover((prevIsPopoverOpen) => {
        if (!prevIsPopoverOpen === true) {
          setTimeout(() => {
            comboboxRef.current?.openList();
          }, 0);
        }
        return !prevIsPopoverOpen;
      }),
    []
  );

  const closePopover = useCallback(() => setPopover(false), []);

  const comboBox = useMemo(
    () => (
      <EuiComboBox
        placeholder="Pick events or index patterns"
        options={allOptions}
        selectedOptions={selectedOptions}
        onChange={onChange}
        renderOption={renderOption}
        ref={(CRef) => {
          comboboxRef.current = CRef as EuiComboBox<string>;
        }}
      />
    ),
    [allOptions, onChange, renderOption, selectedOptions]
  );

  //TODO translation
  const button = useMemo(
    () => (
      <EuiButton iconType="arrowDown" iconSide="right" onClick={togglePopover}>
        indexes
      </EuiButton>
    ),
    [togglePopover]
  );

  useEffect(() => {
    setAllOptions([eventTypeOptions, indexesPatternOptions]);
  }, [indexesPatternOptions]);

  //TODO find a better way to manage the old timeline
  useEffect(() => {
    onChange([{ label: eventType, value: eventType }]);
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
          <div style={{ width: '300px' }}>{comboBox}</div>
        </EuiPopover>
      </EuiToolTip>
    </PickEventContainer>
  );
};

export const PickEventType = memo(PickEventTypeComponents);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiPopover, EuiSelectable, EuiText } from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

const storage = new Storage(localStorage);

export type GroupSelection = 'kibana.alert.rule.name' | 'user.name' | 'host.name' | 'source.ip';

const ContainerEuiSelectable = styled.div`
  width: 200px;
  .euiSelectableListItem__text {
    white-space: pre-wrap !important;
    line-height: normal;
  }
`;

const ruleName = i18n.translate('xpack.securitySolution.selector.groups.ruleName.label', {
  defaultMessage: 'Rule name',
});
const userName = i18n.translate('xpack.securitySolution.selector.grouping.userName.label', {
  defaultMessage: 'User name',
});
const hostName = i18n.translate('xpack.securitySolution.selector.grouping.hostName.label', {
  defaultMessage: 'Host name',
});
const sourceIP = i18n.translate('xpack.securitySolution.selector.grouping.sourceIP.label', {
  defaultMessage: 'Source IP',
});

interface GroupSelectorProps {
  onGroupChange: (groupSelection?: GroupSelection) => void;
  groupSelected?: GroupSelection;
  localStorageGroupKey?: string;
}

const GroupsSelectorComponent = ({
  groupSelected,
  onGroupChange,
  localStorageGroupKey,
}: GroupSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const options = useMemo(
    () => [
      {
        label: ruleName,
        key: 'kibana.alert.rule.name',
        checked: (groupSelected === 'kibana.alert.rule.name'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
      },
      {
        label: userName,
        key: 'user.name',
        checked: (groupSelected === 'user.name'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
      },
      {
        label: hostName,
        key: 'host.name',
        checked: (groupSelected === 'host.name'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
      },
      {
        label: sourceIP,
        key: 'source.ip',
        checked: (groupSelected === 'source.ip'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
      },
    ],
    [groupSelected]
  );

  const selectedOption = options.filter((groupOption) => groupOption.key === groupSelected);

  // add local storage group value
  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onChangeSelectable = useCallback(
    (opts: EuiSelectableOption[]) => {
      const selected = opts.filter((i) => i.checked === 'on');
      if (localStorageGroupKey) {
        storage.set(localStorageGroupKey, selected[0]?.key);
      }

      if (selected.length > 0 && selected[0]) {
        onGroupChange(selected[0].key as GroupSelection);
      } else {
        onGroupChange(undefined);
      }
      setIsPopoverOpen(false);
    },
    [localStorageGroupKey, onGroupChange]
  );

  const button = useMemo(
    () => (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        iconSize="s"
        onClick={onButtonClick}
        size="xs"
        flush="both"
        style={{ fontWeight: 'normal' }}
      >
        {i18n.translate('xpack.securitySolution.selector.grouping.label', {
          defaultMessage: 'Group alerts',
        })}
        {groupSelected ? ': ' : ''}
        {groupSelected && selectedOption.length > 0 ? selectedOption[0].label : ''}
      </EuiButtonEmpty>
    ),
    [groupSelected, onButtonClick, selectedOption]
  );

  const renderOption = useCallback((option) => {
    return (
      <>
        <EuiText size="s">{option.label}</EuiText>
      </>
    );
  }, []);

  const listProps = useMemo(
    () => ({
      rowHeight: 40,
    }),
    []
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <ContainerEuiSelectable>
        <EuiSelectable
          options={options}
          onChange={onChangeSelectable}
          renderOption={renderOption}
          searchable={false}
          listProps={listProps}
          singleSelection={true}
        >
          {(list) => list}
        </EuiSelectable>
      </ContainerEuiSelectable>
    </EuiPopover>
  );
};

export const GroupsSelector = React.memo(GroupsSelectorComponent);

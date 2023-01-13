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
import { ALERTS_TABLE_GROUPS_SELECTION_KEY } from '../../event_rendered_view/helpers';

const storage = new Storage(localStorage);

export type GroupSelection = 'ruleName' | 'userName' | 'hostName' | 'sourceIP';

const ContainerEuiSelectable = styled.div`
  width: 150px;
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
  onGroupChange: (groupSelection: GroupSelection) => void;
  groupSelected?: GroupSelection;
}

const GroupsSelectorComponent = ({ groupSelected, onGroupChange }: GroupSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onChangeSelectable = useCallback(
    (opts: EuiSelectableOption[]) => {
      const selected = opts.filter((i) => i.checked === 'on');
      storage.set(ALERTS_TABLE_GROUPS_SELECTION_KEY, selected[0]?.key);

      if (selected.length > 0 && selected[0]) {
        onGroupChange(selected[0].key as GroupSelection);
      }
      setIsPopoverOpen(false);
    },
    [onGroupChange]
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
      </EuiButtonEmpty>
    ),
    [onButtonClick]
  );

  const options = useMemo(
    () => [
      {
        label: ruleName,
        key: 'ruleName',
        checked: (groupSelected === 'ruleName'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
      },
      {
        label: userName,
        key: 'userName',
        checked: (groupSelected === 'userName'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
      },
      {
        label: hostName,
        key: 'hostName',
        checked: (groupSelected === 'hostName'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
      },
      {
        label: sourceIP,
        key: 'sourceIP',
        checked: (groupSelected === 'sourceIP'
          ? 'on'
          : undefined) as EuiSelectableOption['checked'],
      },
    ],
    [groupSelected]
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
      // rowHeight: 80,
      showIcons: true,
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

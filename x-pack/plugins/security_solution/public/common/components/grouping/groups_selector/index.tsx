/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiButtonEmpty, EuiPopover, EuiBadge, EuiContextMenu } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { CustomFieldPanel } from './custom_field_panel';
import { NavItemBetaBadge } from '../../navigation/nav_item_beta_badge';
import { GROUP_BY, TECHNICAL_PREVIEW } from '../translations';

export type GroupSelection = 'kibana.alert.rule.name' | 'user.name' | 'host.name' | 'source.ip';

const StyledContextMenu = euiStyled(EuiContextMenu)`
  width: 320px;
  & .euiContextMenuItem__text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

interface GroupSelectorProps {
  onGroupChange: (groupSelection?: string) => void;
  groupSelected?: string;
  onClearSelected: () => void;
  fields: FieldSpec[];
  options: Array<{ key: string; label: string }>;
  title?: string;
}

const GroupsSelectorComponent = ({
  groupSelected,
  onGroupChange,
  onClearSelected,
  fields,
  options,
  title = '',
}: GroupSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 'firstPanel',
        items: [
          {
            name: i18n.translate('xpack.securitySolution.groupsSelector.customGroupByOptionName', {
              defaultMessage: 'Custom field',
            }),
            icon: 'empty',
            panel: 'customPanel',
          },
          ...options.map((o) => {
            const icon = groupSelected === o.key ? 'check' : 'empty';
            const panel = {
              name: o.label,
              onClick: () => onGroupChange(o.key),
              icon,
            } as EuiContextMenuPanelItemDescriptor;
            return panel;
          }),
        ],
      },
      {
        id: 'customPanel',
        title: i18n.translate('xpack.securitySolution.groupsSelector.customGroupByPanelTitle', {
          defaultMessage: 'Group By Custom Field',
        }),
        width: 685,
        content: (
          <CustomFieldPanel
            currentOptions={options.map((o) => ({ text: o.label, field: o.key }))}
            onSubmit={(field: string) => {
              onGroupChange(field);
            }}
            fields={fields}
          />
        ),
      },
    ],
    [fields, groupSelected, onGroupChange, options]
  );

  const selectedOption = options.filter((groupOption) => groupOption.key === groupSelected);

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

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
        <NavItemBetaBadge text={TECHNICAL_PREVIEW} className="eui-alignMiddle" />{' '}
        {title ?? GROUP_BY}
        {groupSelected ? ': ' : ''}
        {groupSelected ? (
          <EuiBadge
            color="hollow"
            iconType="cross"
            iconSide="right"
            iconOnClick={() => onClearSelected()}
            iconOnClickAriaLabel="Example of onClick event for icon within the button"
            data-test-sub="groups-selector"
          >
            {groupSelected && selectedOption.length > 0 ? selectedOption[0].label : ''}
          </EuiBadge>
        ) : null}
      </EuiButtonEmpty>
    ),
    [groupSelected, onButtonClick, onClearSelected, selectedOption, title]
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <StyledContextMenu
        initialPanelId="firstPanel"
        panels={panels}
        data-test-subj="groupByContextMenu"
      />
    </EuiPopover>
  );
};

export const GroupsSelector = React.memo(GroupsSelectorComponent);

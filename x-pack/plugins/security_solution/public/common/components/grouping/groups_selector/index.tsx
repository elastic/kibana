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
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge, EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { CustomFieldPanel } from './custom_field_panel';
import { GROUP_BY, TECHNICAL_PREVIEW } from '../translations';
import { StyledContextMenu } from '../styles';

interface GroupSelectorProps {
  onGroupChange: (groupSelection?: string) => void;
  groupSelected?: string;
  onClearSelected: () => void;
  fields: FieldSpec[];
  options: Array<{ key: string; label: string }>;
  title?: string;
}

const GroupsSelectorComponent = ({
  groupSelected = 'none',
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
            name: i18n.translate('xpack.securitySolution.groupsSelector.noneGroupByOptionName', {
              defaultMessage: 'None',
            }),
            icon: groupSelected === 'none' || !groupSelected ? 'check' : 'empty',
            onClick: () => onClearSelected(),
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
          {
            name: i18n.translate('xpack.securitySolution.groupsSelector.customGroupByOptionName', {
              defaultMessage: 'Custom field',
            }),
            icon: 'empty',
            panel: 'customPanel',
          },
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
    [fields, groupSelected, onClearSelected, onGroupChange, options]
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
        {title ?? GROUP_BY}
        {': '}
        {groupSelected && selectedOption.length > 0 ? selectedOption[0].label : 'None'}
      </EuiButtonEmpty>
    ),
    [groupSelected, onButtonClick, selectedOption, title]
  );

  return (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
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
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBetaBadge label={TECHNICAL_PREVIEW} size="s" style={{ marginTop: 2 }} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const GroupsSelector = React.memo(GroupsSelectorComponent);

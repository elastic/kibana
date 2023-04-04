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
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { CustomFieldPanel } from './custom_field_panel';
import * as i18n from '../translations';
import { StyledContextMenu, StyledEuiButtonEmpty } from '../styles';

interface GroupSelectorProps {
  fields: FieldSpec[];
  groupSelected: string;
  onGroupChange: (groupSelection: string) => void;
  options: Array<{ key: string; label: string }>;
  title?: string;
}

const GroupsSelectorComponent = ({
  fields,
  groupSelected = 'none',
  onGroupChange,
  options,
  title = i18n.GROUP_BY,
}: GroupSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 'firstPanel',
        title: (
          <EuiFlexGroup
            component="span"
            justifyContent="spaceBetween"
            gutterSize="none"
            style={{ lineHeight: 1 }}
          >
            <EuiFlexItem grow={false} component="p" style={{ lineHeight: 1.5 }}>
              {i18n.SELECT_FIELD.toUpperCase()}
            </EuiFlexItem>
            <EuiFlexItem grow={false} component="span">
              <EuiBetaBadge
                label={i18n.BETA}
                size="s"
                tooltipContent={i18n.BETA_TOOL_TIP}
                tooltipPosition="left"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        items: [
          {
            'data-test-subj': 'panel-none',
            name: i18n.NONE,
            icon: groupSelected === 'none' ? 'check' : 'empty',
            onClick: () => onGroupChange('none'),
          },
          ...options.map<EuiContextMenuPanelItemDescriptor>((o) => ({
            'data-test-subj': `panel-${o.key}`,
            name: o.label,
            onClick: () => onGroupChange(o.key),
            icon: groupSelected === o.key ? 'check' : 'empty',
          })),
          {
            'data-test-subj': `panel-custom`,
            name: i18n.CUSTOM_FIELD,
            icon: 'empty',
            panel: 'customPanel',
          },
        ],
      },
      {
        id: 'customPanel',
        title: i18n.GROUP_BY_CUSTOM_FIELD,
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
  const selectedOption = useMemo(
    () => options.filter((groupOption) => groupOption.key === groupSelected),
    [groupSelected, options]
  );

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = useMemo(
    () => (
      <StyledEuiButtonEmpty
        data-test-subj="group-selector-dropdown"
        flush="both"
        iconSide="right"
        iconSize="s"
        iconType="arrowDown"
        onClick={onButtonClick}
        title={
          groupSelected !== 'none' && selectedOption.length > 0
            ? selectedOption[0].label
            : i18n.NONE
        }
        size="xs"
      >
        {`${title}: ${
          groupSelected !== 'none' && selectedOption.length > 0
            ? selectedOption[0].label
            : i18n.NONE
        }`}
      </StyledEuiButtonEmpty>
    ),
    [groupSelected, onButtonClick, selectedOption, title]
  );

  return (
    <EuiPopover
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <StyledContextMenu
        data-test-subj="groupByContextMenu"
        initialPanelId="firstPanel"
        panels={panels}
      />
    </EuiPopover>
  );
};

export const GroupsSelector = React.memo(GroupsSelectorComponent);

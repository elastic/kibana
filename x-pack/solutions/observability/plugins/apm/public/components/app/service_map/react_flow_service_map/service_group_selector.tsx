/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, memo } from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  type EuiComboBoxOptionOption,
  EuiIconTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SavedServiceGroup } from '../../../../../common/service_groups';

export interface ServiceGroupSelectorProps {
  serviceGroups: SavedServiceGroup[];
  selectedGroupIds: string[];
  onSelectionChange: (groupIds: string[]) => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Dropdown component to select service groups for dynamic grouping on the service map.
 * Allows multiple selection - services matching any selected group will be grouped.
 * Wrapped in React.memo to prevent unnecessary re-renders.
 */
export const ServiceGroupSelector = memo(function ServiceGroupSelector({
  serviceGroups,
  selectedGroupIds,
  onSelectionChange,
  loading = false,
  disabled = false,
}: ServiceGroupSelectorProps) {
  const { euiTheme } = useEuiTheme();

  // Create a Map for O(1) group lookups
  const groupsById = useMemo(() => {
    const map = new Map<string, SavedServiceGroup>();
    for (const group of serviceGroups) {
      map.set(group.id, group);
    }
    return map;
  }, [serviceGroups]);

  const options: EuiComboBoxOptionOption[] = useMemo(() => {
    return serviceGroups.map((group) => ({
      label: group.groupName,
      value: group.id,
      color: group.color,
    }));
  }, [serviceGroups]);

  // Use Set for O(1) lookup of selected IDs
  const selectedOptions = useMemo(() => {
    const selectedSet = new Set(selectedGroupIds);
    return options.filter((opt) => selectedSet.has(opt.value as string));
  }, [options, selectedGroupIds]);

  const handleChange = useCallback(
    (newSelectedOptions: EuiComboBoxOptionOption[]) => {
      const newIds = newSelectedOptions.map((opt) => opt.value as string);
      onSelectionChange(newIds);
    },
    [onSelectionChange]
  );

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption, searchValue: string, contentClassName: string) => {
      // Use Map for O(1) lookup instead of .find()
      const group = groupsById.get(option.value as string);
      return (
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          className={contentClassName}
        >
          {group?.color && (
            <EuiFlexItem grow={false}>
              <div
                css={css`
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background-color: ${group.color};
                `}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="s">{option.label}</EuiText>
          </EuiFlexItem>
          {group?.description && (
            <EuiFlexItem grow={false}>
              <EuiIconTip content={group.description} type="iInCircle" size="s" color="subdued" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [groupsById]
  );

  if (serviceGroups.length === 0 && !loading) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="layers"
          size="m"
          color="subdued"
          content={i18n.translate('xpack.apm.serviceMap.serviceGroupSelector.tooltip', {
            defaultMessage:
              'Select service groups to visually group their services on the map. Services matching selected groups will be collapsed into group nodes.',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          min-width: 200px;
          max-width: 300px;
        `}
      >
        <EuiComboBox
          compressed
          placeholder={i18n.translate('xpack.apm.serviceMap.serviceGroupSelector.placeholder', {
            defaultMessage: 'Group by service groups',
          })}
          options={options}
          selectedOptions={selectedOptions}
          onChange={handleChange}
          isLoading={loading}
          isDisabled={disabled}
          renderOption={renderOption}
          isClearable
          data-test-subj="serviceMapServiceGroupSelector"
          aria-label={i18n.translate('xpack.apm.serviceMap.serviceGroupSelector.ariaLabel', {
            defaultMessage: 'Select service groups for grouping',
          })}
          css={css`
            .euiComboBox__inputWrap {
              background-color: ${euiTheme.colors.backgroundBasePlain};
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
            }
          `}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

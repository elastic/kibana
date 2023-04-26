/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiIcon, IconType } from '@elastic/eui';
import { AvailableReferenceLineIcon } from '@kbn/expression-xy-plugin/common';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export type IconSet<T> = Array<{
  value: T;
  label: string;
  icon?: T | IconType;
  shouldRotate?: boolean;
  canFill?: boolean;
}>;

const IconView = (props: { value?: string; label: string; icon?: IconType }) => {
  if (!props.value) return null;
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type={props.icon ?? props.value} />
      </EuiFlexItem>
      <EuiFlexItem>{props.label}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function IconSelect<Icon extends string = AvailableReferenceLineIcon>({
  value,
  onChange,
  customIconSet,
  defaultIcon = 'empty',
}: {
  value?: Icon;
  onChange: (newIcon: Icon) => void;
  customIconSet: IconSet<Icon>;
  defaultIcon?: string;
}) {
  const selectedIcon =
    customIconSet.find((option) => value === option.value) ||
    customIconSet.find((option) => option.value === defaultIcon)!;

  return (
    <EuiComboBox
      fullWidth
      data-test-subj="lns-icon-select"
      isClearable={false}
      options={customIconSet}
      selectedOptions={[
        {
          label: selectedIcon.label,
          value: selectedIcon.value,
        },
      ]}
      onChange={(selection) => {
        onChange(selection[0].value!);
      }}
      singleSelection={{ asPlainText: true }}
      renderOption={IconView}
      compressed
      prepend={
        hasIcon(selectedIcon.value) ? (
          <EuiIcon type={selectedIcon.icon ?? selectedIcon.value} />
        ) : undefined
      }
    />
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiIcon, IconType } from '@elastic/eui';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export type IconSet = Array<{ value: string; label: string; icon?: IconType }>;

export const euiIconsSet = [
  {
    value: 'empty',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.noIconLabel', {
      defaultMessage: 'None',
    }),
  },
  {
    value: 'asterisk',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.asteriskIconLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: 'bell',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.bellIconLabel', {
      defaultMessage: 'Bell',
    }),
  },
  {
    value: 'bolt',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.boltIconLabel', {
      defaultMessage: 'Bolt',
    }),
  },
  {
    value: 'bug',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.bugIconLabel', {
      defaultMessage: 'Bug',
    }),
  },
  {
    value: 'editorComment',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.commentIconLabel', {
      defaultMessage: 'Comment',
    }),
  },
  {
    value: 'alert',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.alertIconLabel', {
      defaultMessage: 'Alert',
    }),
  },
  {
    value: 'flag',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.flagIconLabel', {
      defaultMessage: 'Flag',
    }),
  },
  {
    value: 'tag',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.tagIconLabel', {
      defaultMessage: 'Tag',
    }),
  },
];

const IconView = (props: { value?: string; label: string; icon?: IconType }) => {
  if (!props.value) return null;
  return (
    <span>
      <EuiIcon type={props.icon ?? props.value} />
      {` ${props.label}`}
    </span>
  );
};

export const IconSelect = ({
  value,
  onChange,
  customIconSet = euiIconsSet,
}: {
  value?: string;
  onChange: (newIcon: string) => void;
  customIconSet?: IconSet;
}) => {
  const selectedIcon =
    customIconSet.find((option) => value === option.value) ||
    customIconSet.find((option) => option.value === 'empty')!;

  return (
    <EuiComboBox
      isClearable={false}
      options={customIconSet}
      selectedOptions={[selectedIcon]}
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
};

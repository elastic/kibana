/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiIcon, EuiFlexItem, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DropType } from '../../../../types';

function getPropsForDropType(type: 'swap' | 'duplicate' | 'combine') {
  switch (type) {
    case 'duplicate':
      return {
        icon: 'copy',
        label: i18n.translate('xpack.lens.dragDrop.duplicate', {
          defaultMessage: 'Duplicate',
        }),
        controlKey: i18n.translate('xpack.lens.dragDrop.altOption', {
          defaultMessage: 'Alt/Option',
        }),
      };

    case 'swap':
      return {
        icon: 'merge',
        label: i18n.translate('xpack.lens.dragDrop.swap', {
          defaultMessage: 'Swap',
        }),
        controlKey: i18n.translate('xpack.lens.dragDrop.shift', {
          defaultMessage: 'Shift',
        }),
      };
    case 'combine':
      return {
        icon: 'aggregate',
        label: i18n.translate('xpack.lens.dragDrop.combine', {
          defaultMessage: 'Combine',
        }),
        controlKey: i18n.translate('xpack.lens.dragDrop.control', {
          defaultMessage: 'Control',
        }),
      };
    default:
      throw Error('Drop type not supported');
  }
}

const getExtraDrop = ({
  type,
  isIncompatible,
}: {
  type: 'swap' | 'duplicate' | 'combine';
  isIncompatible?: boolean;
}) => {
  const { icon, label, controlKey } = getPropsForDropType(type);
  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="spaceBetween"
      alignItems="center"
      className={classNames('lnsDragDrop__extraDrop', {
        'lnsDragDrop-incompatibleExtraDrop': isIncompatible,
      })}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type={icon} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj={`lnsDragDrop-${type}`}>
            <EuiText size="s">{label}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <code> {controlKey}</code>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const customDropTargetsMap: Partial<{ [dropType in DropType]: React.ReactElement }> = {
  replace_duplicate_incompatible: getExtraDrop({ type: 'duplicate', isIncompatible: true }),
  duplicate_incompatible: getExtraDrop({ type: 'duplicate', isIncompatible: true }),
  swap_incompatible: getExtraDrop({ type: 'swap', isIncompatible: true }),
  replace_duplicate_compatible: getExtraDrop({ type: 'duplicate' }),
  duplicate_compatible: getExtraDrop({ type: 'duplicate' }),
  swap_compatible: getExtraDrop({ type: 'swap' }),
  field_combine: getExtraDrop({ type: 'combine' }),
  combine_compatible: getExtraDrop({ type: 'combine' }),
  combine_incompatible: getExtraDrop({ type: 'combine', isIncompatible: true }),
};

export const getCustomDropTarget = (dropType: DropType) => customDropTargetsMap?.[dropType] || null;

export const getAdditionalClassesOnEnter = (dropType?: string) => {
  if (
    dropType &&
    [
      'field_replace',
      'replace_compatible',
      'replace_incompatible',
      'replace_duplicate_compatible',
      'replace_duplicate_incompatible',
    ].includes(dropType)
  ) {
    return 'lnsDragDrop-isReplacing';
  }
};

export const getAdditionalClassesOnDroppable = (dropType?: string) => {
  if (
    dropType &&
    [
      'move_incompatible',
      'replace_incompatible',
      'swap_incompatible',
      'duplicate_incompatible',
      'replace_duplicate_incompatible',
      'combine_incompatible',
    ].includes(dropType)
  ) {
    return 'lnsDragDrop-notCompatible';
  }
};

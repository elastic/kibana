/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiIcon, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const getExtraDrop = ({
  type,
  isIncompatible,
}: {
  type: 'swap' | 'duplicate';
  isIncompatible?: boolean;
}) => (
  <EuiFlexGroup
    gutterSize="s"
    justifyContent="center"
    alignItems="center"
    className={classNames('lnsDragDrop__extraDrop', {
      'lnsDragDrop-incompatibleExtraDrop': isIncompatible,
    })}
  >
    <EuiFlexItem grow={false}>
      <EuiIcon size="s" type={type === 'duplicate' ? 'copy' : 'expand'} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {type === 'duplicate'
        ? i18n.translate('xpack.lens.dragDrop.duplicate', {
            defaultMessage: 'Duplicate',
          })
        : i18n.translate('xpack.lens.dragDrop.swap', {
            defaultMessage: 'Swap',
          })}
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const customDropTargetsMap = {
  replace_duplicate_incompatible: getExtraDrop({ type: 'duplicate', isIncompatible: true }),
  duplicate_incompatible: getExtraDrop({ type: 'duplicate', isIncompatible: true }),
  swap_incompatible: getExtraDrop({ type: 'swap', isIncompatible: true }),
  replace_duplicate_compatible: getExtraDrop({ type: 'duplicate' }),
  duplicate_compatible: getExtraDrop({ type: 'duplicate' }),
  swap_compatible: getExtraDrop({ type: 'swap' }),
};

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
    ].includes(dropType)
  ) {
    return 'lnsDragDrop-notCompatible';
  }
};

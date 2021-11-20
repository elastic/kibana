/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ColorIndicator } from '../color_indicator';
import { PaletteIndicator } from '../palette_indicator';
import { VisualizationDimensionGroupConfig, AccessorConfig } from '../../../../types';

const triggerLinkA11yText = (label: string) =>
  i18n.translate('xpack.lens.configure.editConfig', {
    defaultMessage: 'Edit {label} configuration',
    values: { label },
  });

export function DimensionButton({
  group,
  children,
  onClick,
  onRemoveClick,
  accessorConfig,
  label,
  invalid,
}: {
  group: VisualizationDimensionGroupConfig;
  children: React.ReactElement;
  onClick: (id: string) => void;
  onRemoveClick: (id: string) => void;
  accessorConfig: AccessorConfig;
  label: string;
  invalid?: boolean;
}) {
  return (
    <>
      <EuiLink
        className="lnsLayerPanel__dimensionLink"
        data-test-subj="lnsLayerPanel-dimensionLink"
        onClick={() => onClick(accessorConfig.columnId)}
        aria-label={triggerLinkA11yText(label)}
        title={triggerLinkA11yText(label)}
        color={invalid || group.invalid ? 'danger' : undefined}
      >
        <ColorIndicator accessorConfig={accessorConfig}>{children}</ColorIndicator>
      </EuiLink>
      <EuiButtonIcon
        className="lnsLayerPanel__dimensionRemove"
        data-test-subj="indexPattern-dimension-remove"
        iconType="cross"
        iconSize="s"
        size="s"
        color="danger"
        aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
          defaultMessage: 'Remove configuration from "{groupLabel}"',
          values: { groupLabel: group.groupLabel },
        })}
        title={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
          defaultMessage: 'Remove configuration from "{groupLabel}"',
          values: { groupLabel: group.groupLabel },
        })}
        onClick={() => onRemoveClick(accessorConfig.columnId)}
      />
      <PaletteIndicator accessorConfig={accessorConfig} />
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DimensionButtonIcon } from '../dimension_button_icon';
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
  errorMessage,
  warningMessage,
}: {
  group: VisualizationDimensionGroupConfig;
  children: React.ReactElement;
  onClick: (id: string) => void;
  onRemoveClick: (id: string) => void;
  accessorConfig: AccessorConfig;
  label: string;
  errorMessage: string | React.ReactNode | undefined;
  warningMessage: string | React.ReactNode | undefined;
}) {
  return (
    <>
      <EuiLink
        className="lnsLayerPanel__dimensionLink"
        data-test-subj="lnsLayerPanel-dimensionLink"
        onClick={() => onClick(accessorConfig.columnId)}
        aria-label={triggerLinkA11yText(label)}
        title={triggerLinkA11yText(label)}
        color={errorMessage ? 'danger' : warningMessage ? 'warning' : undefined}
      >
        <DimensionButtonIcon
          errorMessage={errorMessage}
          warningMessage={warningMessage}
          accessorConfig={accessorConfig}
        >
          {children}
        </DimensionButtonIcon>
      </EuiLink>
      <EuiButtonEmpty
        size="s"
        className="lnsLayerPanel__dimensionRemove"
        data-test-subj="indexPattern-dimension-remove"
        onClick={() => onRemoveClick(accessorConfig.columnId)}
      >
        <EuiIcon
          type="trash"
          size="s"
          color="subdued"
          aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
            defaultMessage: 'Remove configuration from "{groupLabel}"',
            values: { groupLabel: group.groupLabel },
          })}
          title={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
            defaultMessage: 'Remove configuration from "{groupLabel}"',
            values: { groupLabel: group.groupLabel },
          })}
        />
      </EuiButtonEmpty>
      <PaletteIndicator accessorConfig={accessorConfig} />
    </>
  );
}

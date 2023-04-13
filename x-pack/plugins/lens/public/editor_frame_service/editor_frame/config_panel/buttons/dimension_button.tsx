/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { DimensionButtonIcon } from '../dimension_button_icon';
import { PaletteIndicator } from '../palette_indicator';
import { VisualizationDimensionGroupConfig, AccessorConfig, UserMessage } from '../../../../types';

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
  message,
}: {
  group: VisualizationDimensionGroupConfig;
  children: React.ReactElement;
  onClick: (id: string) => void;
  onRemoveClick: (id: string) => void;
  accessorConfig: AccessorConfig;
  label: string;
  message: UserMessage | undefined;
}) {
  return (
    <>
      <div>
        <EuiToolTip
          content={message?.shortMessage || message?.longMessage || undefined}
          position="left"
        >
          <EuiLink
            className="lnsLayerPanel__dimensionLink"
            data-test-subj="lnsLayerPanel-dimensionLink"
            onClick={() => onClick(accessorConfig.columnId)}
            aria-label={triggerLinkA11yText(label)}
            title={triggerLinkA11yText(label)}
            color={
              message?.severity === 'error'
                ? 'danger'
                : message?.severity === 'warning'
                ? 'warning'
                : undefined
            }
          >
            <DimensionButtonIcon message={message} accessorConfig={accessorConfig}>
              {children}
            </DimensionButtonIcon>
          </EuiLink>
        </EuiToolTip>
      </div>
      <EuiButtonIcon
        className="lnsLayerPanel__dimensionRemove"
        data-test-subj="indexPattern-dimension-remove"
        iconType="trash"
        size="xs"
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
        css={css`
          color: ${euiThemeVars.euiTextSubduedColor};
          &:hover {
            color: ${euiThemeVars.euiColorDangerText};
          }
        `}
      />
      <PaletteIndicator accessorConfig={accessorConfig} />
    </>
  );
}

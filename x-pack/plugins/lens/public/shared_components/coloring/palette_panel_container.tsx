/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { MutableRefObject } from 'react';
import { EuiButtonIcon, EuiFlexItem, EuiColorPaletteDisplay, EuiToolTip } from '@elastic/eui';
import { FIXED_PROGRESSION } from '@kbn/coloring';
import { SettingWithSiblingFlyout } from '../setting_with_sibling_flyout';

export function PalettePanelContainer(props: {
  palette: string[];
  siblingRef: MutableRefObject<HTMLDivElement | null>;
  children?: React.ReactElement | React.ReactElement[];
  isInlineEditing?: boolean;
  title?: string;
}) {
  return (
    <SettingWithSiblingFlyout
      {...props}
      dataTestSubj="lns-palettePanelFlyout"
      SettingTrigger={({ onClick }: { onClick: () => void }) => (
        <>
          <EuiFlexItem>
            <EuiColorPaletteDisplay
              data-test-subj="lns_dynamicColoring_edit"
              palette={props.palette}
              type={FIXED_PROGRESSION}
              onClick={onClick}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.lens.colorMapping.editColors', {
                defaultMessage: 'Edit colors',
              })}
            >
              <EuiButtonIcon
                data-test-subj="lns_colorEditing_trigger"
                aria-label={i18n.translate('xpack.lens.colorMapping.editColors', {
                  defaultMessage: 'Edit colors',
                })}
                iconType="controlsHorizontal"
                onClick={onClick}
                size="xs"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </>
      )}
    />
  );
}

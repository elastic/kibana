/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '../../../types';
import { ToolbarPopover } from '../../../shared_components';
import type { TagcloudState } from './types';
import { FontSizeInput } from './font_size_input';

export function TagcloudToolbar(props: VisualizationToolbarProps<TagcloudState>) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <ToolbarPopover
            title={i18n.translate('xpack.lens.tagcloud.appearanceLabel', {
              defaultMessage: 'Appearance',
            })}
            type="visualOptions"
            buttonDataTestSubj="lnsVisualOptionsButton"
            panelClassName="lnsTagcloudToolbar__popover"
          >
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.tagcloud.fontSizeLabel', {
                defaultMessage: 'Font size',
              })}
              fullWidth
            >
              <FontSizeInput
                minFontSize={props.state.minFontSize}
                maxFontSize={props.state.maxFontSize}
                onChange={(minFontSize: number, maxFontSize: number) => {
                  props.setState({
                    ...props.state,
                    minFontSize,
                    maxFontSize,
                  });
                }}
              />
            </EuiFormRow>
          </ToolbarPopover>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

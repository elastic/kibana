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
import { EuiDualRange, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '../../../types';
import { ToolbarPopover, VisLabel } from '../../../shared_components';
import type { TagcloudState } from './types';

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
              <EuiDualRange
                id="tagCloudFontSizeSlider"
                min={5}
                max={120}
                step={1}
                value={[props.state.minFontSize, props.state.maxFontSize]}
                onChange={(value) => {
                  props.setState({
                    ...props.state,
                    minFontSize: value[0],
                    maxFontSize: value[1]
                  });
                }}
                aria-label="Tag cloud font size slider"
              />
            </EuiFormRow>
          </ToolbarPopover>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

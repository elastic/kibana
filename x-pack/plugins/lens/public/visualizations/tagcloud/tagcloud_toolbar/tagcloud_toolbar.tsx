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
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiRadioGroup, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Orientation } from '@kbn/expression-tagcloud-plugin/common';
import type { VisualizationToolbarProps } from '../../../types';
import { ToolbarPopover } from '../../../shared_components';
import type { TagcloudState } from './types';
import { FontSizeInput } from './font_size_input';

const ORIENTATION_OPTIONS = [
  {
    id: Orientation.SINGLE,
    label: i18n.translate('xpack.lens.label.tagcloud.orientation.single', {
      defaultMessage: 'Single',
    }),
  },
  {
    id: Orientation.RIGHT_ANGLED,
    label: i18n.translate('xpack.lens.label.tagcloud.orientation.rightAngled', {
      defaultMessage: 'Right angled',
    }),
  },
  {
    id: Orientation.MULTIPLE,
    label: i18n.translate('xpack.lens.label.tagcloud.orientation.multiple', {
      defaultMessage: 'Multiple',
    }),
  },
];

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
          >
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.tagcloud.fontSizeLabel', {
                defaultMessage: 'Font size',
              })}
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
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.tagcloud.orientationLabel', {
                defaultMessage: 'Orientation',
              })}
            >
              <EuiRadioGroup
                options={ORIENTATION_OPTIONS}
                idSelected={props.state.orientation}
                onChange={(id) => {
                  props.setState({
                    ...props.state,
                    orientation: id,
                  });
                }}
              />
            </EuiFormRow>
            <EuiFormRow>
              <EuiSwitch
                label={i18n.translate('xpack.lens.label.tagcloud.showLabel', {
                  defaultMessage: 'Show label',
                })}
                checked={props.state.showLabel}
                onChange={(event: EuiSwitchEvent) => {
                  props.setState({
                    ...props.state,
                    showLabel: event.target.checked,
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

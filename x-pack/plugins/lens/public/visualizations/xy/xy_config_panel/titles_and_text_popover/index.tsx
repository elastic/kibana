/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ToolbarPopover, ValueLabelsSettings } from '../../../../shared_components';
import { XYState } from '../../types';
import type { FramePublicAPI } from '../../../../types';

export interface TextPopoverProps {
  state: XYState;
  setState: (newState: XYState) => void;
  datasourceLayers: FramePublicAPI['datasourceLayers'];
}
const PANEL_STYLE = {
  width: '460px',
};

export const TextPopover: React.FC<TextPopoverProps> = ({ state, setState }) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.shared.titlesAndTextLabel', {
        defaultMessage: 'Titles and text',
      })}
      type="titlesAndText"
      groupPosition="none"
      buttonDataTestSubj="lnsTextOptionsButton"
      data-test-subj="lnsTextOptionsPopover"
      panelStyle={PANEL_STYLE}
    >
      <ValueLabelsSettings
        label={i18n.translate('xpack.lens.shared.chartBarLabelVisibilityLabel', {
          defaultMessage: 'Bar values',
        })}
        valueLabels={state?.valueLabels ?? 'hide'}
        onValueLabelChange={(newMode) => {
          setState({ ...state, valueLabels: newMode });
        }}
      />
    </ToolbarPopover>
  );
};

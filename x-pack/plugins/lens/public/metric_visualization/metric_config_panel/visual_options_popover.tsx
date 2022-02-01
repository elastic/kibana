/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHorizontalRule } from '@elastic/eui';
import { ToolbarPopover, TooltipWrapper } from '../../shared_components';
import { TitlePositionOptions } from './title_position_option';
import { FramePublicAPI } from '../../types';
import { MetricState } from '../../../common/expressions';
import { TitleAlignOptions } from './title_align_option';
import { TitleSizeOptions } from './title_aize_option';

export interface VisualOptionsPopoverProps {
  state: MetricState;
  setState: (newState: MetricState) => void;
  datasourceLayers: FramePublicAPI['datasourceLayers'];
}

export const VisualOptionsPopover: React.FC<VisualOptionsPopoverProps> = ({ state, setState }) => {
  return (
    <TooltipWrapper
      tooltipContent={i18n.translate('xpack.lens.shared.AppearanceLabel', {
        defaultMessage: 'Appearance',
      })}
      condition={true}
    >
      <ToolbarPopover
        title={i18n.translate('xpack.lens.shared.metric.appearanceLabel', {
          defaultMessage: 'Appearance',
        })}
        type="visualOptions"
        groupPosition="left"
        buttonDataTestSubj="lnsVisualOptionsButton"
      >
        <TitleSizeOptions state={state} setState={setState} />
        <EuiHorizontalRule />
        <TitlePositionOptions state={state} setState={setState} />
        <TitleAlignOptions state={state} setState={setState} />
      </ToolbarPopover>
    </TooltipWrapper>
  );
};

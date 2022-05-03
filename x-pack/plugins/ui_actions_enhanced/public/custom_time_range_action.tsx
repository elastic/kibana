/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  IEmbeddable,
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
} from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { TimeRange } from '@kbn/data-plugin/public';
import { OpenModal, CommonlyUsedRange } from './types';

export const CUSTOM_TIME_RANGE = 'CUSTOM_TIME_RANGE';

export interface TimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

function hasTimeRange(
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>
): embeddable is Embeddable<TimeRangeInput> {
  return (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange !== undefined;
}

const VISUALIZE_EMBEDDABLE_TYPE = 'visualization';

type VisualizeEmbeddable = IEmbeddable<{ id: string }, EmbeddableOutput & { visTypeName: string }>;

function isVisualizeEmbeddable(
  embeddable: IEmbeddable | VisualizeEmbeddable
): embeddable is VisualizeEmbeddable {
  return embeddable.type === VISUALIZE_EMBEDDABLE_TYPE;
}

export interface TimeRangeActionContext {
  embeddable: Embeddable<TimeRangeInput>;
}

export class CustomTimeRangeAction implements Action<TimeRangeActionContext> {
  public readonly type = CUSTOM_TIME_RANGE;
  private openModal: OpenModal;
  private dateFormat?: string;
  private commonlyUsedRanges: CommonlyUsedRange[];
  public readonly id = CUSTOM_TIME_RANGE;
  public order = 30;

  constructor({
    openModal,
    dateFormat,
    commonlyUsedRanges,
  }: {
    openModal: OpenModal;
    dateFormat: string;
    commonlyUsedRanges: CommonlyUsedRange[];
  }) {
    this.openModal = openModal;
    this.dateFormat = dateFormat;
    this.commonlyUsedRanges = commonlyUsedRanges;
  }

  public getDisplayName() {
    return i18n.translate('xpack.uiActionsEnhanced.customizeTimeRangeMenuItem.displayName', {
      defaultMessage: 'Customize time range',
    });
  }

  public getIconType() {
    return 'calendar';
  }

  public async isCompatible({ embeddable }: TimeRangeActionContext) {
    const isInputControl =
      isVisualizeEmbeddable(embeddable) &&
      (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'input_control_vis';

    const isMarkdown =
      isVisualizeEmbeddable(embeddable) &&
      (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'markdown';
    return Boolean(
      embeddable && embeddable.parent && hasTimeRange(embeddable) && !isInputControl && !isMarkdown
    );
  }

  public async execute({ embeddable }: TimeRangeActionContext) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }

    // Only here for typescript
    if (hasTimeRange(embeddable)) {
      const CustomizeTimeRangeModal = await import('./customize_time_range_modal').then(
        (m) => m.CustomizeTimeRangeModal
      );
      const modalSession = this.openModal(
        <CustomizeTimeRangeModal
          onClose={() => modalSession.close()}
          embeddable={embeddable}
          dateFormat={this.dateFormat}
          commonlyUsedRanges={this.commonlyUsedRanges}
        />,
        {
          'data-test-subj': 'customizeTimeRangeModal',
        }
      );
    }
  }
}

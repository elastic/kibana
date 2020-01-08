/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { prettyDuration, commonDurationRanges } from '@elastic/eui';
import { IEmbeddable, Embeddable, EmbeddableInput } from 'src/plugins/embeddable/public';
import { IAction, IncompatibleActionError } from '../../../../src/plugins/ui_actions/public';
import { TimeRange } from '../../../../src/plugins/data/public';
import { CustomizeTimeRangeModal } from './customize_time_range_modal';
import { doesInheritTimeRange } from './does_inherit_time_range';
import { OpenModal, CommonlyUsedRange } from './types';

const CUSTOM_TIME_RANGE_BADGE = 'CUSTOM_TIME_RANGE_BADGE';

export interface TimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

function hasTimeRange(
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>
): embeddable is Embeddable<TimeRangeInput> {
  return (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange !== undefined;
}

interface ActionContext {
  embeddable: Embeddable<TimeRangeInput>;
}

export class CustomTimeRangeBadge implements IAction<ActionContext> {
  public readonly type = CUSTOM_TIME_RANGE_BADGE;
  public readonly id = CUSTOM_TIME_RANGE_BADGE;
  public order = 7;
  private openModal: OpenModal;
  private dateFormat: string;
  private commonlyUsedRanges: CommonlyUsedRange[];

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

  public getDisplayName({ embeddable }: ActionContext) {
    return prettyDuration(
      embeddable.getInput().timeRange.from,
      embeddable.getInput().timeRange.to,
      commonDurationRanges,
      this.dateFormat
    );
  }

  public getIconType() {
    return 'calendar';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return Boolean(embeddable && hasTimeRange(embeddable) && !doesInheritTimeRange(embeddable));
  }

  public async execute({ embeddable }: ActionContext) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }

    // Only here for typescript
    if (hasTimeRange(embeddable)) {
      const modalSession = this.openModal(
        <CustomizeTimeRangeModal
          onClose={() => modalSession.close()}
          embeddable={embeddable}
          dateFormat={this.dateFormat}
          commonlyUsedRanges={this.commonlyUsedRanges}
        />
      );
    }
  }
}

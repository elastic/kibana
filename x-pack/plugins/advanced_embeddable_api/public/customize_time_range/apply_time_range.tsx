/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import {
  Container,
  ContainerInput,
  Embeddable,
  TimeRange,
  PanelState,
  EmbeddableInput,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';

import { APPLY_TIME_RANGE } from './apply_time_range_factory';
import { DynamicAction } from '../dynamic_actions';
import { SerializedDynamicAction } from '../dynamic_actions/action_saved_object';

interface TimeRangeEmbeddableInput extends EmbeddableInput {
  timeRange?: TimeRange;
}

function embeddableAcceptsTimeRange(
  embeddable: Embeddable | Embeddable<TimeRangeEmbeddableInput>
): embeddable is Embeddable<TimeRangeEmbeddableInput> {
  return (embeddable as Embeddable<TimeRangeEmbeddableInput>).getInput().timeRange !== undefined;
}

export class ApplyTimeRangeAction extends DynamicAction {
  public timeRange?: TimeRange;

  constructor(actionSavedObject?: SerializedDynamicAction) {
    super({ actionSavedObject, type: APPLY_TIME_RANGE });
    if (
      actionSavedObject &&
      actionSavedObject.configuration &&
      actionSavedObject.configuration !== ''
    ) {
      this.timeRange = JSON.parse(actionSavedObject.configuration);
    }
  }

  public getConfiguration() {
    return JSON.stringify(this.timeRange);
  }

  public isCompatible({ embeddable }: { embeddable: Embeddable }) {
    return Promise.resolve(embeddableAcceptsTimeRange(embeddable));
  }

  public getTitle() {
    if (!this.timeRange) return 'Inherit from dashboard';
    if (this.timeRange.from === 'now/y' && this.timeRange.to === 'now/y') {
      return 'This year';
    }
    if (this.timeRange.from === 'now/M' && this.timeRange.to === 'now/M') {
      return 'This month';
    }
    if (this.timeRange.from === 'now-15m' && this.timeRange.to === 'now') {
      return 'Last fifteen minutes';
    }
    return `${this.timeRange.from} to ${this.timeRange.to}`;
  }

  public getIcon({ embeddable }: { embeddable: Embeddable; container: Container }) {
    if (!embeddableAcceptsTimeRange(embeddable)) {
      throw new Error('Action is not compatible');
    }

    const timeRange = embeddable.getInput().timeRange;
    const explicitTimeRange = embeddable.parent
      ? embeddable.parent.getInput().panels[embeddable.id].explicitInput.timeRange
      : undefined;

    if (!this.timeRange && explicitTimeRange === undefined) {
      return <EuiIcon type="check" />;
    }

    if (this.timeRange && _.isEqual(this.timeRange, timeRange)) {
      return <EuiIcon type="check" />;
    }

    return <div />;
  }

  public allowTemplateMapping() {
    return false;
  }

  public execute({ embeddable }: { embeddable: Embeddable }) {
    if (!embeddableAcceptsTimeRange(embeddable)) {
      throw new Error('Action is not compatible');
    }
    embeddable.updateInput({
      timeRange: this.timeRange,
    });
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFunction } from 'lodash';
import { NewestIndex } from '../../../common/types';
import { Detection } from '../../../common/detections/types';
import { DetectionRule } from './types';

type DetectionRulesGetter = (detections: Detection[]) => DetectionRule[];
type DetectionRuleRunner = (detections: Detection[]) => Promise<Detection[]>;

export class DetectionRulesExecutor {
  private steps: DetectionRuleRunner[];

  constructor(private index: NewestIndex) {
    this.steps = [];
  }

  add(rulesOrGetter: DetectionRule[] | DetectionRulesGetter) {
    const runner: DetectionRuleRunner = (prevDetections) => {
      const rules = isFunction(rulesOrGetter) ? rulesOrGetter(prevDetections) : rulesOrGetter;
      return this.executeRules(rules);
    };

    this.steps.push(runner);

    return this;
  }

  private executeRules(rules: DetectionRule[]) {
    const parallelRulesExecution = rules.map((rule) => rule.process(this.index));
    return Promise.all(parallelRulesExecution).then(
      (detections) => detections.filter(Boolean) as Detection[]
    );
  }

  async runDetections() {
    const steps = [...this.steps];
    const detections = [];

    while (steps.length > 0) {
      const stepRunner = steps.shift();
      if (stepRunner) {
        const stepDetections: Detection[] = await stepRunner(detections);
        detections.push(...stepDetections);
      }
    }

    return detections;
  }

  static create(index: NewestIndex) {
    return new DetectionRulesExecutor(index);
  }
}

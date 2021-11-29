/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface DateValue {
  date: Date | number;
  value: number;
}

interface TimedEvaluation {
  id: string;
  name: string;
  data: DateValue[];
}

interface Evaluation {
  id: string;
  name: string;
  evaluation: 'pass' | 'fail' | string;
  value: number;
}

interface Framework {
  id: string;
  name: string;
  postureScore: number;
  totalFailed: number;
  totalPassed: number;
  complianceScoreTrend: DateValue[];
}

export interface CspData {
  postureScore: number;
  totalFailed: number;
  totalPassed: number;
  complianceScoreTrend: DateValue[];
  resourcesFindings: TimedEvaluation[];
  resourcesEvaluations: Evaluation[];
  accountEvaluations: Evaluation[];
  totalResourcesCompliance: TimedEvaluation[];
  frameworks: Framework[];
}

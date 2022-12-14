/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicLastRunSetters } from '../types';

export interface RuleLastRunResults {
  errors: string[];
  warnings: string[];
  outcomeMessage: string;
}

export class RuleLastRunService {
  private errors: string[] = [];
  private warnings: string[] = [];
  private outcomeMessage: string = '';

  public getLastRunErrors(): string[] {
    return this.errors;
  }

  public getLastRunWarnings(): string[] {
    return this.warnings;
  }

  public getLastRunOutcomeMessage(): string {
    return this.outcomeMessage;
  }

  public getLastRunResults(): RuleLastRunResults {
    return {
      errors: this.errors,
      warnings: this.warnings,
      outcomeMessage: this.outcomeMessage,
    };
  }

  public getLastRunSetters(): PublicLastRunSetters {
    return {
      addLastRunError: this.addLastRunError.bind(this),
      addLastRunWarning: this.addLastRunWarning.bind(this),
      setLastRunOutcomeMessage: this.setLastRunOutcomeMessage.bind(this),
    };
  }

  private addLastRunError(error: string) {
    this.errors.push(error);
  }

  private addLastRunWarning(warning: string) {
    this.warnings.push(warning);
  }

  private setLastRunOutcomeMessage(outcomeMessage: string) {
    this.outcomeMessage = outcomeMessage;
  }
}

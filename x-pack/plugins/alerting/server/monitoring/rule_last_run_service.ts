/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicLastRunSetters } from '../types';

export type RuleLastRunResults = {
  errors: string[];
  warnings: string[];
  outcomeMessages: string[];
};

export class RuleLastRunService {
  private errors: string[] = [];
  private warnings: string[] = [];
  private outcomeMessages: string[] = [];

  public getLastRunErrors(): string[] {
    return this.errors;
  }

  public getLastRunWarnings(): string[] {
    return this.warnings;
  }

  public getLastRunOutcomeMessages(): string[] {
    return this.outcomeMessages;
  }

  public getLastRunResults(): RuleLastRunResults {
    return {
      errors: this.errors,
      warnings: this.warnings,
      outcomeMessages: this.outcomeMessages,
    };
  }

  public getLastRunSetters(): PublicLastRunSetters {
    return {
      addLastRunError: this.addLastRunError.bind(this),
      addLastRunWarning: this.addLastRunWarning.bind(this),
      addLastRunOutcomeMessage: this.addLastRunOutcomeMessage.bind(this),
    };
  }

  private addLastRunError(error: string) {
    this.errors.push(error)
  }

  private addLastRunWarning(warning: string) {
    this.warnings.push(warning)
  }

  private addLastRunOutcomeMessage(outcomeMessage: string) {
    this.outcomeMessages.push(outcomeMessage)
  }

}

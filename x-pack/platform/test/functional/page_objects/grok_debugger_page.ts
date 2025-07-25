/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class GrokDebuggerPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');
  private readonly retry = this.ctx.getService('retry');

  async simulateButton() {
    return await this.testSubjects.find('btnSimulate');
  }

  async getEventOutput() {
    return await this.testSubjects.getVisibleText('eventOutputCodeBlock');
  }

  async setEventInput(value: string) {
    await this.monacoEditor.setCodeEditorValue(value, 0);
  }

  async setPatternInput(pattern: string) {
    await this.monacoEditor.setCodeEditorValue(pattern, 1);
  }

  async setCustomPatternInput(customPattern: string) {
    await this.monacoEditor.setCodeEditorValue(customPattern, 2);
  }

  async toggleSetCustomPattern() {
    await this.testSubjects.click('grokDebuggerContainer > btnToggleCustomPatternsInput');
  }

  async executeGrokSimulation(input: string, pattern: string, customPattern: string | null) {
    let value;
    await this.setEventInput(input);
    await this.setPatternInput(pattern);
    if (customPattern) {
      await this.toggleSetCustomPattern();
      await this.setCustomPatternInput(customPattern);
    }
    await (await this.simulateButton()).click();
    await this.retry.try(async () => {
      value = JSON.parse(await this.getEventOutput());
      expect(Object.keys(value).length).to.be.greaterThan(0);
    });
    return value;
  }
}

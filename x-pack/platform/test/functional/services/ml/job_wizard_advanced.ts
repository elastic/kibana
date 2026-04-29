/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';
import type { MlCommonUI } from './common_ui';

export function MachineLearningJobWizardAdvancedProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');

  return {
    async getValueOrPlaceholder(inputLocator: string): Promise<string> {
      const value = await testSubjects.getAttribute(inputLocator, 'value');
      if (!value) {
        return (await testSubjects.getAttribute(inputLocator, 'placeholder')) ?? '';
      } else {
        return value;
      }
    },

    async assertDatafeedQueryEditorExists() {
      await testSubjects.existOrFail('mlAdvancedDatafeedQueryEditor > ~codeEditorHint');
    },

    async assertDatafeedQueryEditorValue(expectedValue: string) {
      const actualValue = await monacoEditor.getCodeEditorValue();
      expect(actualValue).to.eql(
        expectedValue,
        `Expected datafeed query editor value to be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async assertQueryDelayInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputQueryDelay');
    },

    async assertQueryDelayValue(expectedValue: string) {
      const actualQueryDelay = await this.getValueOrPlaceholder('mlJobWizardInputQueryDelay');
      expect(actualQueryDelay).to.eql(
        expectedValue,
        `Expected query delay value to be '${expectedValue}' (got '${actualQueryDelay}')`
      );
    },

    async setQueryDelay(queryDelay: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputQueryDelay', queryDelay, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
      await this.assertQueryDelayValue(queryDelay);
    },

    async assertFrequencyInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputFrequency');
    },

    async assertFrequencyValue(expectedValue: string) {
      const actualFrequency = await this.getValueOrPlaceholder('mlJobWizardInputFrequency');
      expect(actualFrequency).to.eql(
        expectedValue,
        `Expected frequency value to be '${expectedValue}' (got '${actualFrequency}')`
      );
    },

    async setFrequency(frequency: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputFrequency', frequency, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
      await this.assertFrequencyValue(frequency);
    },

    async assertScrollSizeInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputScrollSize');
    },

    async assertScrollSizeValue(expectedValue: string) {
      const actualScrollSize = await this.getValueOrPlaceholder('mlJobWizardInputScrollSize');
      expect(actualScrollSize).to.eql(
        expectedValue,
        `Expected scroll size value to be '${expectedValue}' (got '${actualScrollSize}')`
      );
    },

    async setScrollSize(scrollSize: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputScrollSize', scrollSize, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
      await this.assertScrollSizeValue(scrollSize);
    },

    async assertTimeFieldInputExists() {
      await testSubjects.existOrFail('mlTimeFieldNameSelect > comboBoxInput');
    },

    async assertTimeFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlTimeFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected time field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectTimeField(identifier: string) {
      await comboBox.set('mlTimeFieldNameSelect > comboBoxInput', identifier);
      await this.assertTimeFieldSelection([identifier]);
    },

    async assertCategorizationFieldInputExists() {
      await testSubjects.existOrFail('mlCategorizationFieldNameSelect > comboBoxInput');
    },

    async assertCategorizationFieldSelection(expectedIdentifier: string[]) {
      await mlCommonUI.assertOptionsListWithFieldStatsValue(
        'mlCategorizationFieldNameSelect > comboBoxInput',
        expectedIdentifier,
        'categorization field selection'
      );
    },

    async selectCategorizationField(identifier: string) {
      const selector = 'mlCategorizationFieldNameSelect > comboBoxInput';
      await mlCommonUI.setOptionsListWithFieldStatsValue(selector, identifier);
      await this.assertCategorizationFieldSelection([identifier]);
    },

    async assertSummaryCountFieldInputExists() {
      await testSubjects.existOrFail('mlSummaryCountFieldNameSelect > comboBoxInput');
    },

    async assertSummaryCountFieldSelection(expectedIdentifier: string[]) {
      await mlCommonUI.assertOptionsListWithFieldStatsValue(
        'mlSummaryCountFieldNameSelect > comboBoxInput',
        expectedIdentifier,
        'summary count field selection'
      );
    },

    async selectSummaryCountField(identifier: string) {
      await retry.tryForTime(15 * 1000, async () => {
        await mlCommonUI.setOptionsListWithFieldStatsValue(
          'mlSummaryCountFieldNameSelect > comboBoxInput',
          identifier
        );
        await this.assertSummaryCountFieldSelection([identifier]);
      });
    },

    async assertAddDetectorButtonExists() {
      await testSubjects.existOrFail('mlAddDetectorButton');
    },

    async openCreateDetectorModal() {
      await retry.tryForTime(20 * 1000, async () => {
        await testSubjects.click('mlAddDetectorButton');
        await this.assertCreateDetectorModalExists();
      });
    },

    async assertCreateDetectorModalExists() {
      await testSubjects.existOrFail('mlCreateDetectorModal', { timeout: 5000 });
    },

    async assertDetectorFunctionInputExists() {
      await testSubjects.existOrFail('mlAdvancedFunctionSelect > comboBoxInput');
    },

    async assertDetectorFunctionSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedFunctionSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected detector function selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectDetectorFunction(identifier: string) {
      await comboBox.set('mlAdvancedFunctionSelect > comboBoxInput', identifier);
      await this.assertDetectorFunctionSelection([identifier]);
    },

    async assertDetectorFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedFieldSelect > comboBoxInput');
    },

    async assertDetectorFieldSelection(expectedIdentifier: string[]) {
      await mlCommonUI.assertOptionsListWithFieldStatsValue(
        'mlAdvancedFieldSelect > comboBoxInput',
        expectedIdentifier,
        'detector field selection'
      );
    },

    async selectDetectorField(identifier: string) {
      await mlCommonUI.setOptionsListWithFieldStatsValue(
        'mlAdvancedFieldSelect > comboBoxInput',
        identifier
      );
      await this.assertDetectorFieldSelection([identifier]);
    },

    async assertDetectorByFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedByFieldSelect > comboBoxInput');
    },

    async assertDetectorByFieldSelection(expectedIdentifier: string[]) {
      await mlCommonUI.assertOptionsListWithFieldStatsValue(
        'mlAdvancedByFieldSelect > comboBoxInput',
        expectedIdentifier,
        'detector by field selection'
      );
    },

    async selectDetectorByField(identifier: string) {
      await mlCommonUI.setOptionsListWithFieldStatsValue(
        'mlAdvancedByFieldSelect > comboBoxInput',
        identifier
      );
      await this.assertDetectorByFieldSelection([identifier]);
    },

    async assertDetectorOverFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedOverFieldSelect > comboBoxInput');
    },

    async assertDetectorOverFieldSelection(expectedIdentifier: string[]) {
      await mlCommonUI.assertOptionsListWithFieldStatsValue(
        'mlAdvancedOverFieldSelect > comboBoxInput',
        expectedIdentifier,
        'detector over field selection'
      );
    },

    async selectDetectorOverField(identifier: string) {
      await mlCommonUI.setOptionsListWithFieldStatsValue(
        'mlAdvancedOverFieldSelect > comboBoxInput',
        identifier
      );
      await this.assertDetectorOverFieldSelection([identifier]);
    },

    async assertDetectorPartitionFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedPartitionFieldSelect > comboBoxInput');
    },

    async assertDetectorPartitionFieldSelection(expectedIdentifier: string[]) {
      await mlCommonUI.assertOptionsListWithFieldStatsValue(
        'mlAdvancedPartitionFieldSelect > comboBoxInput',
        expectedIdentifier,
        'detector partition field selection'
      );
    },

    async selectDetectorPartitionField(identifier: string) {
      await mlCommonUI.setOptionsListWithFieldStatsValue(
        'mlAdvancedPartitionFieldSelect > comboBoxInput',
        identifier
      );
      await this.assertDetectorPartitionFieldSelection([identifier]);
    },

    async assertDetectorExcludeFrequentInputExists() {
      await testSubjects.existOrFail('mlAdvancedExcludeFrequentSelect > comboBoxInput');
    },

    async assertDetectorExcludeFrequentSelection(expectedIdentifier: string[]) {
      await mlCommonUI.assertOptionsListWithFieldStatsValue(
        'mlAdvancedExcludeFrequentSelect > comboBoxInput',
        expectedIdentifier,
        'detector exclude frequent selection'
      );
    },

    async selectDetectorExcludeFrequent(identifier: string) {
      await mlCommonUI.setOptionsListWithFieldStatsValue(
        'mlAdvancedExcludeFrequentSelect > comboBoxInput',
        identifier
      );
      await this.assertDetectorExcludeFrequentSelection([identifier]);
    },

    async assertDetectorDescriptionInputExists() {
      await testSubjects.existOrFail('mlAdvancedDetectorDescriptionInput');
    },

    async assertDetectorDescriptionValue(expectedValue: string) {
      const actualDetectorDescription = await testSubjects.getAttribute(
        'mlAdvancedDetectorDescriptionInput',
        'value'
      );
      expect(actualDetectorDescription).to.eql(
        expectedValue,
        `Expected detector description value to be '${expectedValue}' (got '${actualDetectorDescription}')`
      );
    },

    async setDetectorDescription(description: string) {
      await mlCommonUI.setValueWithChecks('mlAdvancedDetectorDescriptionInput', description, {
        clearWithKeyboard: true,
      });
      await this.assertDetectorDescriptionValue(description);
    },

    async confirmAddDetectorModal() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlCreateDetectorModalSaveButton');
      await testSubjects.missingOrFail('mlCreateDetectorModal');
    },

    async cancelAddDetectorModal() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlCreateDetectorModalCancelButton');
      await testSubjects.missingOrFail('mlCreateDetectorModal');
    },

    async assertDetectorEntryExists(
      detectorIndex: number,
      expectedDetectorName: string,
      expectedDetectorDescription?: string
    ) {
      await testSubjects.existOrFail(`mlAdvancedDetector ${detectorIndex}`);

      const actualDetectorIdentifier = await testSubjects.getVisibleText(
        `mlAdvancedDetector ${detectorIndex} > mlDetectorIdentifier`
      );
      expect(actualDetectorIdentifier).to.eql(
        expectedDetectorName,
        `Expected detector name to be '${expectedDetectorName}' (got '${actualDetectorIdentifier}')`
      );

      if (expectedDetectorDescription !== undefined) {
        const actualDetectorDescription = await testSubjects.getVisibleText(
          `mlAdvancedDetector ${detectorIndex} > mlDetectorDescription`
        );
        expect(actualDetectorDescription).to.eql(
          expectedDetectorDescription,
          `Expected detector description to be '${expectedDetectorDescription}' (got '${actualDetectorDescription}')`
        );
      }
    },

    async clickEditDetector(detectorIndex: number) {
      await retry.tryForTime(20 * 1000, async () => {
        await testSubjects.click(
          `mlAdvancedDetector ${detectorIndex} > mlAdvancedDetectorEditButton`
        );
        await this.assertCreateDetectorModalExists();
      });
    },

    async createJob() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobWizardButtonCreateJob');
      await testSubjects.existOrFail('mlStartDatafeedModal', { timeout: 10 * 1000 });
    },
  };
}

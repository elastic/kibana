/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export function PipelineEditorProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');

  // test subject selectors
  const SUBJ_CONTAINER = '~pipelineEdit';
  const getContainerSubjForId = (id: string): string => `~pipelineEdit-${id}`;
  const SUBJ_INPUT_ID = '~pipelineEdit > inputId';
  const SUBJ_INPUT_DESCRIPTION = '~pipelineEdit > inputDescription';

  const SUBJ_INPUT_WORKERS = '~pipelineEdit > inputWorkers';
  const SUBJ_INPUT_BATCH_SIZE = '~pipelineEdit > inputBatchSize';
  const SUBJ_SELECT_QUEUE_TYPE = '~pipelineEdit > selectQueueType';
  const SUBJ_INPUT_QUEUE_MAX_BYTES_NUMBER = '~pipelineEdit > inputQueueMaxBytesNumber';
  const SUBJ_SELECT_QUEUE_MAX_BYTES_UNITS = '~pipelineEdit > selectQueueMaxBytesUnits';
  const SUBJ_INPUT_QUEUE_CHECKPOINT_WRITES = '~pipelineEdit > inputQueueCheckpointWrites';

  const SUBJ_BTN_SAVE = '~pipelineEdit > btnSavePipeline';
  const SUBJ_BTN_CANCEL = '~pipelineEdit > btnCancel';
  const SUBJ_BTN_DELETE = '~pipelineEdit > btnDeletePipeline';
  const SUBJ_LNK_BREADCRUMB_MANAGEMENT = 'breadcrumbs > lnkBreadcrumb0';

  const DEFAULT_INPUT_VALUES = {
    id: '',
    description: '',
    pipeline: ['input {', '}', 'filter {', '}', 'output {', '}'].join('\n'),
    workers: '1',
    batchSize: '125',
    queueType: 'memory',
    queueMaxBytesNumber: '1',
    queueMaxBytesUnits: 'gb',
    queueCheckpointWrites: '1024',
  };

  return new (class PipelineEditor {
    async clickSave(): Promise<void> {
      await testSubjects.click(SUBJ_BTN_SAVE);
    }
    async clickCancel(): Promise<void> {
      await testSubjects.click(SUBJ_BTN_CANCEL);
    }
    async clickDelete(): Promise<void> {
      await testSubjects.click(SUBJ_BTN_DELETE);
    }
    async clickManagementBreadcrumb(): Promise<void> {
      await testSubjects.click(SUBJ_LNK_BREADCRUMB_MANAGEMENT);
    }

    async setId(value: string): Promise<void> {
      await testSubjects.setValue(SUBJ_INPUT_ID, value);
    }
    async setDescription(value: string): Promise<void> {
      await testSubjects.setValue(SUBJ_INPUT_DESCRIPTION, value);
    }
    async setPipeline(value: string): Promise<void> {
      await monacoEditor.setCodeEditorValue(value, 0);
    }
    async setWorkers(value: string): Promise<void> {
      await testSubjects.setValue(SUBJ_INPUT_WORKERS, value);
    }
    async setBatchSize(value: string): Promise<void> {
      await testSubjects.setValue(SUBJ_INPUT_BATCH_SIZE, value);
    }
    async setQueueType(value: string): Promise<void> {
      await testSubjects.click(`${SUBJ_SELECT_QUEUE_TYPE}-${value}`);
    }
    async setQueueMaxBytesNumber(value: string): Promise<void> {
      await testSubjects.setValue(SUBJ_INPUT_QUEUE_MAX_BYTES_NUMBER, value);
    }
    async setQueueMaxBytesUnits(value: string): Promise<void> {
      await testSubjects.click(`${SUBJ_SELECT_QUEUE_MAX_BYTES_UNITS}-${value}`);
    }
    async setQueueCheckpointWrites(value: string): Promise<void> {
      await testSubjects.setValue(SUBJ_INPUT_QUEUE_CHECKPOINT_WRITES, value);
    }

    /**
     *  Assert that the editor is visible on the page and
     *  throw a meaningful error if not
     *  @return {Promise<undefined>}
     */
    async assertExists(): Promise<void> {
      await retry.waitFor(
        'pipeline editor visible',
        async () => await testSubjects.exists(SUBJ_CONTAINER)
      );
    }

    /**
     *  Assert that the editor is visible on the page and is
     *  working on a specific id
     *  @param  {string} id
     *  @return {Promise<undefined>}
     */
    async assertEditorId(id: string): Promise<void> {
      await retry.waitFor(
        `editor id to be "${id}"`,
        async () => await testSubjects.exists(getContainerSubjForId(id))
      );
    }

    /**
     *  Assert that the editors fields match the defaults
     *  @return {Promise<undefined>}
     */
    async assertDefaultInputs(): Promise<void> {
      await this.assertInputs(DEFAULT_INPUT_VALUES);
    }

    /**
     *  Assert that the editors fields match the passed values
     *  @param  {Object} expectedValues - must have id, description, and pipeline keys
     *  @return {Promise<undefined>}
     */
    async assertInputs(expectedValues: {
      id: string;
      description: string;
      pipeline: string;
      workers: string;
      batchSize: string;
      queueType: string;
      queueMaxBytesNumber: string;
      queueMaxBytesUnits: string;
      queueCheckpointWrites: string;
    }): Promise<void> {
      const values = await Promise.all([
        testSubjects.getAttribute(SUBJ_INPUT_ID, 'value'),
        testSubjects.getAttribute(SUBJ_INPUT_DESCRIPTION, 'value'),
        monacoEditor.getCodeEditorValue(),
        testSubjects.getAttribute(SUBJ_INPUT_WORKERS, 'value'),
        testSubjects.getAttribute(SUBJ_INPUT_BATCH_SIZE, 'value'),
        testSubjects.getAttribute(SUBJ_SELECT_QUEUE_TYPE, 'value'),
        testSubjects.getAttribute(SUBJ_INPUT_QUEUE_MAX_BYTES_NUMBER, 'value'),
        testSubjects.getAttribute(SUBJ_SELECT_QUEUE_MAX_BYTES_UNITS, 'value'),
        testSubjects.getAttribute(SUBJ_INPUT_QUEUE_CHECKPOINT_WRITES, 'value'),
      ]).then((val) => ({
        id: val[0],
        description: val[1],
        pipeline: val[2],
        workers: val[3],
        batchSize: val[4],
        queueType: val[5],
        queueMaxBytesNumber: val[6],
        queueMaxBytesUnits: val[7],
        queueCheckpointWrites: val[8],
      }));

      expect(values).to.eql(expectedValues);
    }

    async assertNoDeleteButton(): Promise<void> {
      await retry.waitFor(
        `delete button to be hidden`,
        async () => !(await testSubjects.exists(SUBJ_BTN_DELETE))
      );
    }
  })();
}

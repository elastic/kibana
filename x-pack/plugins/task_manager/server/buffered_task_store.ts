/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectError } from '@kbn/core-saved-objects-common';
import { TaskStore } from './task_store';
import { ConcreteTaskInstance } from './task';
import { isErr, isOk } from './lib/result_type';

// by default allow updates to be buffered for up to 50ms
const DEFAULT_BUFFER_MAX_DURATION = 50;
const DEFAULT_MAX_SIZE = 100;

interface UpdateOperation {
  doc: ConcreteTaskInstance;
  resolve: (value: ConcreteTaskInstance) => void;
  reject: (error: { type: string; id: string; error: SavedObjectError }) => void;
}

interface DeleteOperation {
  id: string;
  resolve: () => void;
  reject: (error: { type: string; id: string; error: SavedObjectError }) => void;
}

export class BufferedTaskStore {
  private readonly taskStore: TaskStore;
  private updateBuffer: UpdateOperation[] = [];
  private updateBufferTimer?: NodeJS.Timer;
  private removeBuffer: DeleteOperation[] = [];
  private removeBufferTimer?: NodeJS.Timer;

  constructor(taskStore: TaskStore) {
    this.taskStore = taskStore;
  }

  public async update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance> {
    return new Promise((resolve, reject) => {
      this.updateBuffer.push({ doc, resolve, reject });
      this.checkUpdateBufferForFlushing();
    });
  }

  public async remove(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.removeBuffer.push({ id, resolve, reject });
      this.checkRemoveBufferForFlushing();
    });
  }

  private checkUpdateBufferForFlushing(forceFlush: boolean = false) {
    if (this.updateBuffer.length >= DEFAULT_MAX_SIZE || forceFlush) {
      const buffer = this.updateBuffer;
      this.updateBuffer = [];
      clearTimeout(this.updateBufferTimer);
      delete this.updateBufferTimer;
      (async () => {
        try {
          const results = await this.taskStore.bulkUpdate(buffer.map((b) => b.doc));
          results.forEach((result, i) => {
            if (isErr(result)) {
              buffer[i].reject(result.error);
            } else if (isOk(result)) {
              buffer[i].resolve(result.value);
            }
          });
        } catch (e) {
          buffer.forEach((b) => b.reject(e));
        }
      })();
    } else if (!this.updateBufferTimer) {
      this.updateBufferTimer = setTimeout(
        () => this.checkUpdateBufferForFlushing(true),
        DEFAULT_BUFFER_MAX_DURATION
      );
    }
  }

  private checkRemoveBufferForFlushing(forceFlush: boolean = false) {
    if (this.removeBuffer.length >= DEFAULT_MAX_SIZE || forceFlush) {
      const buffer = this.removeBuffer;
      this.removeBuffer = [];
      clearTimeout(this.removeBufferTimer);
      delete this.removeBufferTimer;
      (async () => {
        try {
          const results = await this.taskStore.bulkRemove(buffer.map((b) => b.id));
          results.statuses.forEach((result, i) => {
            if (result.error) {
              buffer[i].reject({ type: result.type, id: result.id, error: result.error });
            } else {
              buffer[i].resolve();
            }
          });
        } catch (e) {
          buffer.forEach((b) => b.reject(e));
        }
      })();
    } else if (!this.removeBufferTimer) {
      this.removeBufferTimer = setTimeout(
        () => this.checkRemoveBufferForFlushing(true),
        DEFAULT_BUFFER_MAX_DURATION
      );
    }
  }
}

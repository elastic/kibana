/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { Worker, MessagePort, MessageChannel } from 'worker_threads';
import { CelValidationWorkerOutOfMemoryError } from './errors';
import {
  ValidateCelRequest,
  ValidateCelResponse,
  ValidateCelResponseType,
  WorkerData,
} from './worker';

export class CelValidator {
  private worker?: Worker;
  protected workerModulePath: string;

  /**
   * The maximum heap size for old memory region of the worker thread.
   *
   * @note We need to provide a sane number given that we need to load a
   * node environment for TS compilation (dev-builds only), some library code
   * and buffers that result from generating a PDF.
   *
   * Local testing indicates that to trigger an OOM event for the worker we need
   * to exhaust not only heap but also any compression optimization and fallback
   * swap space.
   *
   * With this value we are able to generate PDFs in excess of 5000x5000 pixels
   * at which point issues other than memory start to show like glitches in the
   * image.
   */
  protected workerMaxOldHeapSizeMb = 128;

  /**
   * The maximum heap size for young memory region of the worker thread.
   *
   * @note we leave this 'undefined' to use the Node.js default value.
   * @note we set this to a low value to trigger an OOM event sooner for the worker
   * in test scenarios.
   */
  protected workerMaxYoungHeapSizeMb: number | undefined = undefined;

  constructor(dist: boolean) {
    // running in dist: `worker.ts` becomes `worker.js`
    // running in source: `worker_src_harness.ts` needs to be wrapped in JS and have a ts-node environment initialized.
    this.workerModulePath = path.resolve(
      __dirname,
      dist ? './worker.js' : './worker_src_harness.js'
    );
  }

  private createWorker(port: MessagePort): Worker {
    const workerData: WorkerData = {
      port,
    };
    return new Worker(this.workerModulePath, {
      workerData,
      resourceLimits: {
        maxYoungGenerationSizeMb: this.workerMaxYoungHeapSizeMb,
        maxOldGenerationSizeMb: this.workerMaxOldHeapSizeMb,
      },
      transferList: [port],
    });
  }

  private async cleanupWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate().catch(); // best effort
      this.worker = undefined;
      console.log('Worker terminated.');
    }
  }

  public async validate(inputProgram: string): Promise<string> {
    if (this.worker) throw new Error('CEL validation already in progress..!');

    console.log(`Creating worker for validating CEL program`);

    try {
      return await new Promise<string>(async (resolve, reject) => {
        try {
          const { port1: myPort, port2: theirPort } = new MessageChannel();
          this.worker = this.createWorker(theirPort);
          this.worker.on('error', (workerError: NodeJS.ErrnoException) => {
            console.log(`Worker error: ${workerError}`);
            if (workerError.code === 'ERR_WORKER_OUT_OF_MEMORY') {
              reject(new CelValidationWorkerOutOfMemoryError(workerError.message).message);
            } else {
              reject(workerError.message);
            }
          });
          this.worker.on('exit', () => {
            console.log('Worker exited');
          });
          myPort.on('message', ({ type, error, data, message }: ValidateCelResponse) => {
            if (type === ValidateCelResponseType.Error) {
              reject(new Error(`CEL validation returned the following error: ${error}`));
              return;
            }
            if (type === ValidateCelResponseType.Data && !data) {
              reject(new Error(`Failed to validate CEL program`));
              return;
            }
            if (data) {
              resolve(data.formattedProgram);
            }
          }); // Handle response from worker
          const validateCelRequest: ValidateCelRequest = {
            data: {
              inputProgram,
            },
          };
          myPort.postMessage(validateCelRequest); // Call the worker's validation function
        } catch (error) {
          reject(error);
        }
      });
    } finally {
      await this.cleanupWorker(); // Cleanup worker after validation and on errors
    }
  }
}

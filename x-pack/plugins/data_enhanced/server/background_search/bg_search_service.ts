/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { Logger } from 'kibana/server';

const INMEM_TRACKING_TIMEOUT = 60000;
const INMEM_TRACKING_INTERVAL = 1000;

export class BackgroundSearchService {
  private idMapping = new Map<string, Map<string, string>>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private checkSavedObject(sessionId: string): boolean {
    return false;
  }

  private getSavedObject(sessionId: string): any {
    return;
  }

  private async createSavedObject(sessionId: string) {}

  private updateSavedObject(sessionId: string, requestKey: Map<string, string>): any {
    requestKey.forEach(searchId => {
      this.updateExpiration(searchId);
    });
  }

  private updateExpiration(searchId: string) {}

  private getKey(userId: string, requestParams: any): string {
    return createHash(`md5`)
      .update(JSON.stringify({ uid: userId, req: requestParams }))
      .digest('hex');
  }

  private setupMonitor(sessionId: string) {
    if (!this.idMapping.get(sessionId)) return;

    const startTime = new Date().getTime();
    const interval = setInterval(() => {
      const curTime = new Date().getTime();

      // sessionIds are held in memory for a limited time.
      // If that time had passed, clear the ID from memory
      if (curTime - startTime >= INMEM_TRACKING_TIMEOUT) {
        this.logger.debug(`Timeout session ${sessionId}`);
        clearInterval(interval);
        this.idMapping.delete(sessionId);
      } else if (this.checkSavedObject(sessionId)) {
        this.logger.debug(`Store session ${sessionId}`);
        const sessionInfo = this.idMapping.get(sessionId);
        if (sessionInfo) {
          this.updateSavedObject(sessionId, sessionInfo);
          this.idMapping.delete(sessionId);
        }
      }
    }, INMEM_TRACKING_INTERVAL);
  }

  public async store(sessionId: string) {
    const backgroundSearchObj = await this.createSavedObject(sessionId);
    // searchIds?.forEach(searchId => {
    //   this.trackId()
    // })
  }

  public trackId(userId: string, sessionId: string, requestParams: any, searchId: string) {
    this.logger.debug(`trackId ${searchId} (user ${userId} | sess ${sessionId}`);
    // console.log(`trackId ${searchId} (user ${userId} | sess ${sessionId}`);
    // console.log(`req ${JSON.stringify(requestParams, null, '\t')}`);
    const reqHashKey = this.getKey(userId, requestParams);
    if (!this.checkSavedObject(sessionId)) {
      // Track IDs in memory
      let sessionIdsInfo = this.idMapping.get(sessionId);
      if (!sessionIdsInfo) {
        sessionIdsInfo = new Map();
        this.idMapping.set(sessionId, sessionIdsInfo);
      }
      sessionIdsInfo.set(reqHashKey, searchId);
      this.setupMonitor(sessionId);
    } else {
      // Update saved object directly
      const sessionIdsInfo = new Map();
      sessionIdsInfo.set(reqHashKey, searchId);
      this.updateSavedObject(sessionId, sessionIdsInfo);
    }
  }

  public getId(userId: string, sessionId: string, requestParams: any) {
    const bgSavedObject = this.getSavedObject(sessionId);
    if (!bgSavedObject) {
      return undefined;
    } else {
      const reqHashKey = this.getKey(userId, requestParams);
      return '';
    }
  }
}

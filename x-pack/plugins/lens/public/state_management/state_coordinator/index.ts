/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { Patch } from '../../../common/types';
import { STATE_PATCH_API_PATH } from '../../../common/constants';

type Listener = (patches: Patch[]) => void;

export class StateCoordinator {
  private static _instance: StateCoordinator;
  private static http?: HttpSetup;
  private static visId?: string;
  private static sessionId?: string;
  private static POLLING_INTERVAL = 1000;

  public static setHTTP(http: HttpSetup) {
    this.http = http;
  }

  public static setVisId(id: string) {
    this.visId = id;
  }

  public static setSessionId(id: string) {
    this.sessionId = id;
  }

  public static async runPoll() {
    const { http, visId, sessionId, POLLING_INTERVAL } = StateCoordinator;

    let patches: Patch[] = [];
    if (http && visId && sessionId) {
      patches = (
        await http.get<{ patches: Patch[] }>(STATE_PATCH_API_PATH, {
          query: {
            visId,
            sessionId,
          },
        })
      ).patches;
    }

    console.log(patches);

    setTimeout(() => this.runPoll(), POLLING_INTERVAL);
  }

  private constructor() {}

  public static get instance() {
    if (!this._instance) {
      this._instance = new StateCoordinator();
    }

    return this._instance;
  }

  registerPatchListener(listener: Listener) {
    this.listeners.push(listener);
  }

  public sendPatch(patch: Patch) {
    const { http, visId, sessionId } = StateCoordinator;
    if (!http || !visId) return;

    http.post(STATE_PATCH_API_PATH, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patch,
        visId,
        sessionId,
      }),
    });
  }
}

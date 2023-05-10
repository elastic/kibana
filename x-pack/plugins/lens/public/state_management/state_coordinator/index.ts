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

const CUSTOM_BASE_PATH = 'http://localhost:3000';
const FETCH_URL = `${CUSTOM_BASE_PATH}${STATE_PATCH_API_PATH}`;

export class StateCoordinator {
  private static http?: HttpSetup;
  private static visId?: string;
  private static sessionId?: string;
  // private static POLLING_INTERVAL = 1000;
  private static listeners: Listener[] = [];

  public static setHTTP(http: HttpSetup) {
    this.http = http;
  }

  public static setVisId(id: string) {
    this.visId = id;
  }

  public static setSessionId(id: string) {
    this.sessionId = id;
  }

  public static async listen() {
    return; // uncomment to enable state coordination
    const { visId, sessionId } = StateCoordinator;
    if (!visId || !sessionId) return;
    // let patches: Patch[] = [];
    // if (http && visId && sessionId) {
    //   patches = (
    //     await http.get<{ patches: Patch[] }>(STATE_PATCH_API_PATH, {
    //       query: {
    //         visId,
    //         sessionId,
    //       },
    //     })
    //   ).patches;
    // }
    // StateCoordinator.listeners.forEach((listener) => patches.length && listener(patches));
    // setTimeout(() => this.runPoll(), POLLING_INTERVAL);
    const eventSourceUrl = new URL(FETCH_URL);
    eventSourceUrl.searchParams.set('visId', visId);
    eventSourceUrl.searchParams.set('sessionId', sessionId);

    const events = new EventSource(eventSourceUrl);

    events.onmessage = (event) => {
      const patches: Patch[] = JSON.parse(event.data);

      console.log(patches);
      StateCoordinator.listeners.forEach((listener) => patches.length && listener(patches));
    };
  }

  private constructor() {}

  public static registerPatchListener(listener: Listener) {
    StateCoordinator.listeners.push(listener);
  }

  public static clearVisualizationPatches() {
    const { http, visId } = StateCoordinator;
    if (!http || !visId) return;

    return http.delete(STATE_PATCH_API_PATH, {
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      query: {
        visId,
      },
    });
  }

  public static sendPatch(patch: Patch) {
    const { visId, sessionId } = StateCoordinator;
    if (!visId || !sessionId) return;

    fetch(FETCH_URL, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ patch, visId, sessionId }),
    });

    // Have to use fetch for now since we're using a custom server
    // Core doesn't currently support server-sent events
    // http.post(STATE_PATCH_API_PATH, {
    //   cache: 'no-cache',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     patch,
    //     visId,
    //     sessionId,
    //   }),
    // });
  }
}

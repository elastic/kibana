/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineArgs } from '.';
import { TimelineEventsAllRequestOptions } from '../../../common/search_strategy/timeline';

/*
 * Future Engineer
 * This class is just there to manage temporarily the reload of the active timeline when switching tabs
 * because of the bootstrap of the security solution app, we will always trigger the query
 * to avoid it we will cache its request and response so we can go back where the user was before switching tabs
 *
 * !!! Important !!! this is just there until, we will have a better way to bootstrap the app
 * I did not want to put in the store because I was feeling it will feel less temporarily and I did not want other engineer using it
 *
 */

export interface ActiveTimelineExpandedEventType {
  eventId: string;
  indexName: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmptyObject = Record<any, never>;

export type ActiveTimelineExpandedEvent = ActiveTimelineExpandedEventType | EmptyObject;

class ActiveTimelineEvents {
  private _activePage: number = 0;
  private _expandedEvent: ActiveTimelineExpandedEvent = {};
  private _pageName: string = '';
  private _request: TimelineEventsAllRequestOptions | null = null;
  private _response: TimelineArgs | null = null;

  getActivePage() {
    return this._activePage;
  }

  setActivePage(activePage: number) {
    this._activePage = activePage;
  }

  getExpandedEvent() {
    return this._expandedEvent;
  }

  toggleExpandedEvent(expandedEvent: ActiveTimelineExpandedEvent) {
    if (expandedEvent.eventId === this._expandedEvent.eventId) {
      this._expandedEvent = {};
    } else {
      this._expandedEvent = expandedEvent;
    }
  }

  setExpandedEvent(expandedEvent: ActiveTimelineExpandedEvent) {
    this._expandedEvent = expandedEvent;
  }

  getPageName() {
    return this._pageName;
  }

  setPageName(pageName: string) {
    this._pageName = pageName;
  }

  getRequest() {
    return this._request;
  }

  setRequest(req: TimelineEventsAllRequestOptions) {
    this._request = req;
  }

  getResponse() {
    return this._response;
  }

  setResponse(resp: TimelineArgs | null) {
    this._response = resp;
  }
}

export const activeTimeline = new ActiveTimelineEvents();

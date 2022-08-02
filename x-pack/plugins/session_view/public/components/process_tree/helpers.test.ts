/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cloneDeep } from 'lodash';
import {
  mockEvents,
  mockAlerts,
  mockProcessMap,
} from '../../../common/mocks/constants/session_view_process.mock';
import {
  AlertStatusEventEntityIdMap,
  Process,
  ProcessMap,
  ProcessEvent,
} from '../../../common/types/process_tree';
import { ALERT_STATUS } from '../../../common/constants';
import {
  updateAlertEventStatus,
  updateProcessMap,
  buildProcessTree,
  searchProcessTree,
  autoExpandProcessTree,
} from './helpers';

const SESSION_ENTITY_ID = '3d0192c6-7c54-5ee6-a110-3539a7cf42bc';
const SEARCH_QUERY = 'vi';
const SEARCH_RESULT_PROCESS_ID = '8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726';

describe('process tree hook helpers tests', () => {
  let processMap: ProcessMap;

  beforeEach(() => {
    processMap = {};
  });

  it('updateProcessMap works', () => {
    processMap = updateProcessMap(processMap, mockEvents);

    // processes are added to processMap
    mockEvents.forEach((event) => {
      expect(processMap[event?.process?.entity_id!]).toBeTruthy();
    });
  });

  it('buildProcessTree works', () => {
    const newOrphans = buildProcessTree(mockProcessMap, mockEvents, [], SESSION_ENTITY_ID);

    const sessionLeaderChildrenIds = new Set(
      mockProcessMap[SESSION_ENTITY_ID].children.map((child: Process) => child.id)
    );

    // processes are added under their parent's childrean array in processMap
    mockEvents.forEach((event) => {
      expect(sessionLeaderChildrenIds.has(event?.process?.entity_id!));
    });

    expect(newOrphans.length).toBe(0);
  });

  it('searchProcessTree works', () => {
    const searchResults = searchProcessTree(mockProcessMap, SEARCH_QUERY, true);

    // search returns the process with search query in its event args
    expect(searchResults[0].id).toBe(SEARCH_RESULT_PROCESS_ID);
  });

  it('autoExpandProcessTree works', () => {
    processMap = mockProcessMap;
    // mock what buildProcessTree does
    const childProcesses = Object.values(processMap).filter(
      (process) => process.id !== SESSION_ENTITY_ID
    );
    processMap[SESSION_ENTITY_ID].children = childProcesses;

    expect(processMap[SESSION_ENTITY_ID].autoExpand).toBeFalsy();
    processMap = autoExpandProcessTree(processMap, SEARCH_RESULT_PROCESS_ID);
    // session leader should have autoExpand to be true
    expect(processMap[SESSION_ENTITY_ID].autoExpand).toBeTruthy();
  });

  it('updateAlertEventStatus works', () => {
    let events: ProcessEvent[] = cloneDeep([...mockEvents, ...mockAlerts]);
    const updatedAlertsStatus: AlertStatusEventEntityIdMap = {
      [mockAlerts[0].kibana?.alert?.uuid!]: {
        status: ALERT_STATUS.CLOSED,
        processEntityId: mockAlerts[0].process?.entity_id!,
      },
    };

    expect(
      events.find(
        (event) =>
          event.kibana?.alert?.uuid &&
          event.kibana?.alert?.uuid === mockAlerts[0].kibana?.alert?.uuid
      )?.kibana?.alert?.workflow_status
    ).toEqual(ALERT_STATUS.OPEN);
    expect(
      events.find(
        (event) =>
          event.kibana?.alert?.uuid &&
          event.kibana?.alert?.uuid === mockAlerts[1].kibana?.alert?.uuid
      )?.kibana?.alert?.workflow_status
    ).toEqual(ALERT_STATUS.OPEN);

    events = updateAlertEventStatus(events, updatedAlertsStatus);

    expect(
      events.find(
        (event) =>
          event.kibana?.alert?.uuid &&
          event.kibana?.alert?.uuid === mockAlerts[0].kibana?.alert?.uuid
      )?.kibana?.alert?.workflow_status
    ).toEqual(ALERT_STATUS.CLOSED);
    expect(
      events.find(
        (event) =>
          event.kibana?.alert?.uuid &&
          event.kibana?.alert?.uuid === mockAlerts[1].kibana?.alert?.uuid
      )?.kibana?.alert?.workflow_status
    ).toEqual(ALERT_STATUS.OPEN);
  });
});

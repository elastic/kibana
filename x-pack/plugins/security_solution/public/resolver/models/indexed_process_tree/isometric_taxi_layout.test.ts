/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IsometricTaxiLayout } from '../../types';
import { LegacyEndpointEvent } from '../../../../common/endpoint/types';
import { isometricTaxiLayout } from './isometric_taxi_layout';
import { mockProcessEvent } from '../../models/process_event_test_helpers';
import { factory } from './index';

describe('resolver graph layout', () => {
  let processA: LegacyEndpointEvent;
  let processB: LegacyEndpointEvent;
  let processC: LegacyEndpointEvent;
  let processD: LegacyEndpointEvent;
  let processE: LegacyEndpointEvent;
  let processF: LegacyEndpointEvent;
  let processG: LegacyEndpointEvent;
  let processH: LegacyEndpointEvent;
  let processI: LegacyEndpointEvent;
  let events: LegacyEndpointEvent[];
  let layout: () => IsometricTaxiLayout;

  beforeEach(() => {
    /*
     *          A
     *      ____|____
     *     |         |
     *     B         C
     *  ___|___   ___|___
     * |       | |       |
     * D       E F       G
     *                   |
     *                   H
     *
     */
    processA = mockProcessEvent({
      endgame: {
        process_name: '',
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 0,
      },
    });
    processB = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'already_running',
        unique_pid: 1,
        unique_ppid: 0,
      },
    });
    processC = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 2,
        unique_ppid: 0,
      },
    });
    processD = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 3,
        unique_ppid: 1,
      },
    });
    processE = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 4,
        unique_ppid: 1,
      },
    });
    processF = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 5,
        unique_ppid: 2,
      },
    });
    processG = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 6,
        unique_ppid: 2,
      },
    });
    processH = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 7,
        unique_ppid: 6,
      },
    });
    processI = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'termination_event',
        unique_pid: 8,
        unique_ppid: 0,
      },
    });
    layout = () => isometricTaxiLayout(factory(events));
    events = [];
  });
  describe('when rendering no nodes', () => {
    it('renders right', () => {
      expect(layout()).toMatchSnapshot();
    });
  });
  describe('when rendering one node', () => {
    beforeEach(() => {
      events = [processA];
    });
    it('renders right', () => {
      expect(layout()).toMatchSnapshot();
    });
  });
  describe('when rendering two nodes, one being the parent of the other', () => {
    beforeEach(() => {
      events = [processA, processB];
    });
    it('renders right', () => {
      expect(layout()).toMatchSnapshot();
    });
  });
  describe('when rendering two forks, and one fork has an extra long tine', () => {
    beforeEach(() => {
      events = [
        processA,
        processB,
        processC,
        processD,
        processE,
        processF,
        processG,
        processH,
        processI,
      ];
    });
    it('renders right', () => {
      expect(layout()).toMatchSnapshot();
    });
  });
});

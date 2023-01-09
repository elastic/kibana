/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InactivityTimeouts } from './build_status_runtime_field';
import { _buildStatusRuntimeField } from './build_status_runtime_field';

describe('buildStatusRuntimeField', () => {
  const now = 1234567890123;
  beforeAll(() => {
    global.Date.now = jest.fn(() => now);
  });
  it('should build the correct runtime field if there are no inactivity timeouts', () => {
    const inactivityTimeouts: InactivityTimeouts = [];
    const runtimeField = _buildStatusRuntimeField(inactivityTimeouts);
    expect(runtimeField).toMatchInlineSnapshot(`
      Object {
        "status": Object {
          "script": Object {
            "lang": "painless",
            "source": "
          long lastCheckinMillis = doc['last_checkin'].size() > 0 
            ? doc['last_checkin'].value.toInstant().toEpochMilli() 
            : (
                doc['enrolled_at'].size() > 0 
                ? doc['enrolled_at'].value.toInstant().toEpochMilli() 
                : -1
              );
          if (doc['active'].size() > 0 && doc['active'].value == false) {
            emit('unenrolled'); 
          } else if (lastCheckinMillis > 0 && doc['policy_id'].size() > 0 && false) {
            emit('inactive');
          } else if (
              lastCheckinMillis > 0 
              && lastCheckinMillis 
              < (1234567590123L)
          ) { 
            emit('offline'); 
          } else if (
            doc['policy_revision_idx'].size() == 0 || (
              doc['upgrade_started_at'].size() > 0 &&
              doc['upgraded_at'].size() == 0
            )
          ) { 
            emit('updating'); 
          } else if (doc['last_checkin'].size() == 0) {
            emit('enrolling'); 
          } else if (doc['unenrollment_started_at'].size() > 0) {
            emit('unenrolling'); 
          } else if (
            doc['last_checkin_status'].size() > 0 &&
            doc['last_checkin_status'].value.toLowerCase() == 'error'
          ) { 
              emit('error');
          } else if (
            doc['last_checkin_status'].size() > 0 &&
            doc['last_checkin_status'].value.toLowerCase() == 'degraded'
          ) { 
            emit('degraded');
          } else { 
            emit('online'); 
          }",
          },
          "type": "keyword",
        },
      }
    `);
  });
  it('should build the correct runtime field if there are no inactivity timeouts (prefix)', () => {
    const inactivityTimeouts: InactivityTimeouts = [];
    const runtimeField = _buildStatusRuntimeField(inactivityTimeouts, 'my.prefix.');
    expect(runtimeField).toMatchInlineSnapshot(`
      Object {
        "status": Object {
          "script": Object {
            "lang": "painless",
            "source": "
          long lastCheckinMillis = doc['my.prefix.last_checkin'].size() > 0 
            ? doc['my.prefix.last_checkin'].value.toInstant().toEpochMilli() 
            : (
                doc['my.prefix.enrolled_at'].size() > 0 
                ? doc['my.prefix.enrolled_at'].value.toInstant().toEpochMilli() 
                : -1
              );
          if (doc['my.prefix.active'].size() > 0 && doc['my.prefix.active'].value == false) {
            emit('unenrolled'); 
          } else if (lastCheckinMillis > 0 && doc['my.prefix.policy_id'].size() > 0 && false) {
            emit('inactive');
          } else if (
              lastCheckinMillis > 0 
              && lastCheckinMillis 
              < (1234567590123L)
          ) { 
            emit('offline'); 
          } else if (
            doc['my.prefix.policy_revision_idx'].size() == 0 || (
              doc['my.prefix.upgrade_started_at'].size() > 0 &&
              doc['my.prefix.upgraded_at'].size() == 0
            )
          ) { 
            emit('updating'); 
          } else if (doc['my.prefix.last_checkin'].size() == 0) {
            emit('enrolling'); 
          } else if (doc['my.prefix.unenrollment_started_at'].size() > 0) {
            emit('unenrolling'); 
          } else if (
            doc['my.prefix.last_checkin_status'].size() > 0 &&
            doc['my.prefix.last_checkin_status'].value.toLowerCase() == 'error'
          ) { 
              emit('error');
          } else if (
            doc['my.prefix.last_checkin_status'].size() > 0 &&
            doc['my.prefix.last_checkin_status'].value.toLowerCase() == 'degraded'
          ) { 
            emit('degraded');
          } else { 
            emit('online'); 
          }",
          },
          "type": "keyword",
        },
      }
    `);
  });
  it('should build the correct runtime field if there is one inactivity timeout', () => {
    const inactivityTimeouts: InactivityTimeouts = [
      {
        inactivityTimeout: 300,
        policyIds: ['policy-1'],
      },
    ];
    const runtimeField = _buildStatusRuntimeField(inactivityTimeouts);
    expect(runtimeField).toMatchInlineSnapshot(`
      Object {
        "status": Object {
          "script": Object {
            "lang": "painless",
            "source": "
          long lastCheckinMillis = doc['last_checkin'].size() > 0 
            ? doc['last_checkin'].value.toInstant().toEpochMilli() 
            : (
                doc['enrolled_at'].size() > 0 
                ? doc['enrolled_at'].value.toInstant().toEpochMilli() 
                : -1
              );
          if (doc['active'].size() > 0 && doc['active'].value == false) {
            emit('unenrolled'); 
          } else if (lastCheckinMillis > 0 && doc['policy_id'].size() > 0 && (doc['policy_id'].value == 'policy-1') && lastCheckinMillis < 1234567590123L) {
            emit('inactive');
          } else if (
              lastCheckinMillis > 0 
              && lastCheckinMillis 
              < (1234567590123L)
          ) { 
            emit('offline'); 
          } else if (
            doc['policy_revision_idx'].size() == 0 || (
              doc['upgrade_started_at'].size() > 0 &&
              doc['upgraded_at'].size() == 0
            )
          ) { 
            emit('updating'); 
          } else if (doc['last_checkin'].size() == 0) {
            emit('enrolling'); 
          } else if (doc['unenrollment_started_at'].size() > 0) {
            emit('unenrolling'); 
          } else if (
            doc['last_checkin_status'].size() > 0 &&
            doc['last_checkin_status'].value.toLowerCase() == 'error'
          ) { 
              emit('error');
          } else if (
            doc['last_checkin_status'].size() > 0 &&
            doc['last_checkin_status'].value.toLowerCase() == 'degraded'
          ) { 
            emit('degraded');
          } else { 
            emit('online'); 
          }",
          },
          "type": "keyword",
        },
      }
    `);
  });
  it('should build the correct runtime field if there are multiple inactivity timeouts with same timeout', () => {
    const inactivityTimeouts: InactivityTimeouts = [
      {
        inactivityTimeout: 300,
        policyIds: ['policy-1', 'policy-2'],
      },
    ];
    const runtimeField = _buildStatusRuntimeField(inactivityTimeouts);
    expect(runtimeField).toMatchInlineSnapshot(`
      Object {
        "status": Object {
          "script": Object {
            "lang": "painless",
            "source": "
          long lastCheckinMillis = doc['last_checkin'].size() > 0 
            ? doc['last_checkin'].value.toInstant().toEpochMilli() 
            : (
                doc['enrolled_at'].size() > 0 
                ? doc['enrolled_at'].value.toInstant().toEpochMilli() 
                : -1
              );
          if (doc['active'].size() > 0 && doc['active'].value == false) {
            emit('unenrolled'); 
          } else if (lastCheckinMillis > 0 && doc['policy_id'].size() > 0 && (doc['policy_id'].value == 'policy-1' || doc['policy_id'].value == 'policy-2') && lastCheckinMillis < 1234567590123L) {
            emit('inactive');
          } else if (
              lastCheckinMillis > 0 
              && lastCheckinMillis 
              < (1234567590123L)
          ) { 
            emit('offline'); 
          } else if (
            doc['policy_revision_idx'].size() == 0 || (
              doc['upgrade_started_at'].size() > 0 &&
              doc['upgraded_at'].size() == 0
            )
          ) { 
            emit('updating'); 
          } else if (doc['last_checkin'].size() == 0) {
            emit('enrolling'); 
          } else if (doc['unenrollment_started_at'].size() > 0) {
            emit('unenrolling'); 
          } else if (
            doc['last_checkin_status'].size() > 0 &&
            doc['last_checkin_status'].value.toLowerCase() == 'error'
          ) { 
              emit('error');
          } else if (
            doc['last_checkin_status'].size() > 0 &&
            doc['last_checkin_status'].value.toLowerCase() == 'degraded'
          ) { 
            emit('degraded');
          } else { 
            emit('online'); 
          }",
          },
          "type": "keyword",
        },
      }
    `);
  });
  it('should build the correct runtime field if there are multiple inactivity timeouts with different timeout', () => {
    const inactivityTimeouts: InactivityTimeouts = [
      {
        inactivityTimeout: 300,
        policyIds: ['policy-1', 'policy-2'],
      },
      {
        inactivityTimeout: 400,
        policyIds: ['policy-3'],
      },
    ];
    const runtimeField = _buildStatusRuntimeField(inactivityTimeouts);
    expect(runtimeField).toMatchInlineSnapshot(`
      Object {
        "status": Object {
          "script": Object {
            "lang": "painless",
            "source": "
          long lastCheckinMillis = doc['last_checkin'].size() > 0 
            ? doc['last_checkin'].value.toInstant().toEpochMilli() 
            : (
                doc['enrolled_at'].size() > 0 
                ? doc['enrolled_at'].value.toInstant().toEpochMilli() 
                : -1
              );
          if (doc['active'].size() > 0 && doc['active'].value == false) {
            emit('unenrolled'); 
          } else if (lastCheckinMillis > 0 && doc['policy_id'].size() > 0 && (doc['policy_id'].value == 'policy-1' || doc['policy_id'].value == 'policy-2') && lastCheckinMillis < 1234567590123L || (doc['policy_id'].value == 'policy-3') && lastCheckinMillis < 1234567490123L) {
            emit('inactive');
          } else if (
              lastCheckinMillis > 0 
              && lastCheckinMillis 
              < (1234567590123L)
          ) { 
            emit('offline'); 
          } else if (
            doc['policy_revision_idx'].size() == 0 || (
              doc['upgrade_started_at'].size() > 0 &&
              doc['upgraded_at'].size() == 0
            )
          ) { 
            emit('updating'); 
          } else if (doc['last_checkin'].size() == 0) {
            emit('enrolling'); 
          } else if (doc['unenrollment_started_at'].size() > 0) {
            emit('unenrolling'); 
          } else if (
            doc['last_checkin_status'].size() > 0 &&
            doc['last_checkin_status'].value.toLowerCase() == 'error'
          ) { 
              emit('error');
          } else if (
            doc['last_checkin_status'].size() > 0 &&
            doc['last_checkin_status'].value.toLowerCase() == 'degraded'
          ) { 
            emit('degraded');
          } else { 
            emit('online'); 
          }",
          },
          "type": "keyword",
        },
      }
    `);
  });
  it('should build the same runtime field if path ends with. or not', () => {
    const inactivityTimeouts: InactivityTimeouts = [];
    const runtimeFieldWithDot = _buildStatusRuntimeField(inactivityTimeouts, 'my.prefix.');
    const runtimeFieldNoDot = _buildStatusRuntimeField(inactivityTimeouts, 'my.prefix');
    expect(runtimeFieldWithDot).toEqual(runtimeFieldNoDot);
  });
});

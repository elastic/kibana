/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useRuleWithFallback } from './use_rule_with_fallback';
import * as api from './api';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('./api');
jest.mock('../alerts/api');
jest.mock('../../../../common/hooks/use_app_toasts');

describe('useRuleWithFallback', () => {
  (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state on mount', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useRuleWithFallback('testRuleId'));
      await waitForNextUpdate();
      expect(result.current).toEqual({
        error: undefined,
        isExistingRule: true,
        loading: false,
        refresh: expect.any(Function),
        rule: null,
      });
    });
  });

  it('should return the rule if it exists', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useRuleWithFallback('testRuleId'));
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toMatchInlineSnapshot(`
        Object {
          "error": undefined,
          "isExistingRule": true,
          "loading": false,
          "refresh": [Function],
          "rule": Object {
            "actions": Array [],
            "author": Array [],
            "created_at": "mm/dd/yyyyTHH:MM:sssz",
            "created_by": "mockUser",
            "description": "some desc",
            "enabled": true,
            "false_positives": Array [],
            "filters": Array [],
            "from": "now-360s",
            "id": "12345678987654321",
            "immutable": false,
            "index": Array [
              "apm-*-transaction*",
              "traces-apm*",
              "auditbeat-*",
              "endgame-*",
              "filebeat-*",
              "packetbeat-*",
              "winlogbeat-*",
            ],
            "interval": "5m",
            "language": "kuery",
            "max_signals": 100,
            "name": "Test rule",
            "query": "user.email: 'root@elastic.co'",
            "references": Array [],
            "risk_score": 75,
            "risk_score_mapping": Array [],
            "rule_id": "bbd3106e-b4b5-4d7c-a1a2-47531d6a2baf",
            "severity": "high",
            "severity_mapping": Array [],
            "tags": Array [
              "APM",
            ],
            "threat": Array [],
            "throttle": null,
            "to": "now",
            "type": "query",
            "updated_at": "mm/dd/yyyyTHH:MM:sssz",
            "updated_by": "mockUser",
          },
        }
      `);
    });
  });

  it("should fallback to fetching rule data from a signal if the rule doesn't exist", async () => {
    (api.fetchRuleById as jest.Mock).mockImplementation(async () => {
      const err = new Error('Not found') as SecurityAppError;
      err.body = { status_code: 404, message: 'Rule Not found' };
      throw err;
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook((id) => useRuleWithFallback(id), {
        initialProps: 'testRuleId',
      });
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toMatchInlineSnapshot(`
        Object {
          "error": [Error: Not found],
          "isExistingRule": false,
          "loading": false,
          "refresh": [Function],
          "rule": Object {
            "created_at": "2020-02-12T19:49:29.417Z",
            "created_by": "elastic",
            "description": "matches most events",
            "enabled": true,
            "false_positives": Array [],
            "filters": Array [],
            "from": "now-360s",
            "id": "2df3a613-f5a8-4b55-bf6a-487fc820b842",
            "immutable": false,
            "index": Array [
              "apm-*-transaction*",
              "traces-apm*",
              "auditbeat-*",
              "endgame-*",
              "filebeat-*",
              "packetbeat-*",
              "winlogbeat-*",
            ],
            "interval": "5m",
            "language": "kuery",
            "max_signals": 100,
            "meta": Object {
              "from": "1m",
            },
            "name": "matches host.name exists",
            "output_index": ".siem-signals-default",
            "query": "host.name : *",
            "references": Array [
              "https://google.com",
            ],
            "risk_score": 79,
            "rule_id": "82b2b065-a2ee-49fc-9d6d-781a75c3d280",
            "severity": "high",
            "tags": Array [
              "host.name exists",
              "for testing",
              "__internal_rule_id:82b2b065-a2ee-49fc-9d6d-781a75c3d280",
              "__internal_immutable:false",
            ],
            "threat": Array [
              Object {
                "framework": "MITRE ATT&CK",
                "tactic": Object {
                  "id": "TA0006",
                  "name": "Credential Access",
                  "reference": "https://attack.mitre.org/tactics/TA0006",
                },
                "technique": Array [
                  Object {
                    "id": "T1110",
                    "name": "Brute Force",
                    "reference": "https://attack.mitre.org/techniques/T1110",
                  },
                  Object {
                    "id": "T1098",
                    "name": "Account Manipulation",
                    "reference": "https://attack.mitre.org/techniques/T1098",
                  },
                  Object {
                    "id": "T1081",
                    "name": "Credentials in Files",
                    "reference": "https://attack.mitre.org/techniques/T1081",
                  },
                ],
              },
              Object {
                "framework": "MITRE ATT&CK",
                "tactic": Object {
                  "id": "TA0009",
                  "name": "Collection",
                  "reference": "https://attack.mitre.org/tactics/TA0009",
                },
                "technique": Array [
                  Object {
                    "id": "T1530",
                    "name": "Data from Cloud Storage Object",
                    "reference": "https://attack.mitre.org/techniques/T1530",
                  },
                ],
              },
            ],
            "to": "now",
            "type": "query",
            "updated_at": "2020-02-14T23:15:06.186Z",
            "updated_by": "elastic",
            "version": 1,
          },
        }
      `);
    });
  });
});

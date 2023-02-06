/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { createStoredScriptRoute } from './create_script_route';
import { RISK_SCORE_CREATE_STORED_SCRIPT } from '../../../../common/constants';
import { createStoredScript } from './lib/create_script';
import { transformError } from '@kbn/securitysolution-es-utils';

const testScriptId = 'test-script';
const testScriptSource =
  'if (state.host_variant_set == false) {\n    if (doc.containsKey("host.os.full") && doc["host.os.full"].size() != 0) {\n        state.host_variant = doc["host.os.full"].value;\n        state.host_variant_set = true;\n    }\n}\n// Aggregate all the tactics seen on the host\nif (doc.containsKey("signal.rule.threat.tactic.id") && doc["signal.rule.threat.tactic.id"].size() != 0) {\n    state.tactic_ids.add(doc["signal.rule.threat.tactic.id"].value);\n}\n// Get running sum of time-decayed risk score per rule name per shard\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, [0.0,"",false]);\nint time_diff = (int)((System.currentTimeMillis() - doc["@timestamp"].value.toInstant().toEpochMilli()) / (1000.0 * 60.0 * 60.0));\ndouble risk_derate = Math.min(1, Math.exp((params.lookback_time - time_diff) / params.time_decay_constant));\nstats[0] = Math.max(stats[0], doc["signal.rule.risk_score"].value * risk_derate);\nif (stats[2] == false) {\n    stats[1] = doc["kibana.alert.rule.uuid"].value;\n    stats[2] = true;\n}\nstate.rule_risk_stats.put(rule_name, stats);';

jest.mock('./lib/create_script', () => {
  const actualModule = jest.requireActual('./lib/create_script');
  return {
    ...actualModule,
    createStoredScript: jest
      .fn()
      .mockResolvedValue({ [testScriptId]: { success: true, error: null } }),
  };
});

describe('createStoredScriptRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  const logger = { error: jest.fn() } as unknown as Logger;

  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    createStoredScriptRoute(server.router, logger);
  });

  it('Create stored script', async () => {
    const request = requestMock.create({
      method: 'put',
      path: RISK_SCORE_CREATE_STORED_SCRIPT,
      body: {
        id: testScriptId,
        script: {
          lang: 'painless',
          source: testScriptSource,
        },
      },
    });
    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(createStoredScript).toHaveBeenCalled();
    expect(response.status).toEqual(200);
  });

  it('Create stored script - should validate input', async () => {
    const invalidRequest = requestMock.create({
      method: 'put',
      path: RISK_SCORE_CREATE_STORED_SCRIPT,
    });
    await server.inject(invalidRequest, requestContextMock.convertContext(context));
    const result = server.validate(invalidRequest);

    expect(result.ok).not.toHaveBeenCalled();
  });

  it('return error if failed to create stored script', async () => {
    (createStoredScript as jest.Mock).mockResolvedValue({
      [testScriptId]: { success: false, error: transformError(new Error('unknown error')) },
    });
    const request = requestMock.create({
      method: 'put',
      path: RISK_SCORE_CREATE_STORED_SCRIPT,
      body: {
        id: testScriptId,
        script: {
          lang: 'painless',
          source: testScriptSource,
        },
      },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));
    expect(createStoredScript).toHaveBeenCalled();
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ message: 'unknown error', status_code: 500 });
  });
});

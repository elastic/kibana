/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
  ResponseActionType,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { isAgentTypeAndActionSupported } from './is_agent_type_and_action_supported';
import { ExperimentalFeaturesService } from '../../../experimental_features_service';
import type { ExperimentalFeatures } from '../../../../../common';
import { allowedExperimentalValues } from '../../../../../common';

jest.mock('../../../experimental_features_service');

describe('isAgentTypeAndActionSupported() util', () => {
  const enableFeatures = (overrides: Partial<ExperimentalFeatures> = {}): void => {
    (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
      ...allowedExperimentalValues,
      responseActionsSentinelOneGetFileEnabled: true,
      responseActionsCrowdstrikeManualHostIsolationEnabled: true,
      ...overrides,
    });
  };

  const disableS1GetFileFeature = () => {
    enableFeatures({ responseActionsSentinelOneGetFileEnabled: false });
  };
  const disableCSIsolateFeature = () => {
    enableFeatures({ responseActionsCrowdstrikeManualHostIsolationEnabled: false });
  };

  const resetFeatures = (): void => {
    (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
      ...allowedExperimentalValues,
    });
  };

  beforeEach(() => {
    enableFeatures();
  });

  afterEach(() => {
    resetFeatures();
  });

  it.each`
    agentType         | actionName    | actionType     | expectedValue | runSetup
    ${'endpoint'}     | ${undefined}  | ${undefined}   | ${true}       | ${undefined}
    ${'endpoint'}     | ${'isolate'}  | ${'manual'}    | ${true}       | ${undefined}
    ${'endpoint'}     | ${'isolate'}  | ${'automated'} | ${true}       | ${undefined}
    ${'sentinel_one'} | ${undefined}  | ${undefined}   | ${true}       | ${undefined}
    ${'sentinel_one'} | ${'isolate'}  | ${'manual'}    | ${true}       | ${undefined}
    ${'sentinel_one'} | ${'get-file'} | ${'manual'}    | ${true}       | ${undefined}
    ${'sentinel_one'} | ${'get-file'} | ${undefined}   | ${false}      | ${disableS1GetFileFeature}
    ${'crowdstrike'}  | ${undefined}  | ${undefined}   | ${true}       | ${undefined}
    ${'crowdstrike'}  | ${'isolate'}  | ${'manual'}    | ${true}       | ${undefined}
    ${'crowdstrike'}  | ${'isolate'}  | ${undefined}   | ${false}      | ${disableCSIsolateFeature}
  `(
    'should return `$expectedValue` for $agentType $actionName ($actionType)',
    ({
      agentType,
      actionName,
      actionType,
      expectedValue,
      runSetup,
    }: {
      agentType: ResponseActionAgentType;
      actionName?: ResponseActionsApiCommandNames;
      actionType?: ResponseActionType;
      runSetup?: () => void;
      expectedValue: boolean;
    }) => {
      if (runSetup) {
        runSetup();
      }

      expect(isAgentTypeAndActionSupported(agentType, actionName, actionType)).toBe(expectedValue);
    }
  );
});

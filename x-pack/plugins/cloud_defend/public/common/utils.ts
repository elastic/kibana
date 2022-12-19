/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { ControlSelector, ControlSelectorCondition } from '../types';

export function getInputFromPolicy(policy: NewPackagePolicy, inputId: string) {
  return policy.inputs.find((input) => input.type === inputId);
}

export function getControlSelectorValueForProp(prop: string, selector: ControlSelector) {
  switch (prop as unknown as ControlSelectorCondition) {
    case ControlSelectorCondition.operation:
      return selector.operation;
    case ControlSelectorCondition.containerImageName:
      return selector.containerImageName;
    case ControlSelectorCondition.containerImageTag:
      return selector.containerImageTag;
    case ControlSelectorCondition.targetFilePath:
      return selector.targetFilePath;
    case ControlSelectorCondition.orchestratorClusterName:
      return selector.orchestratorClusterName;
    case ControlSelectorCondition.orchestratorClusterId:
      return selector.orchestratorClusterId;
    case ControlSelectorCondition.orchestratorResourceName:
      return selector.orchestratorResourceName;
    case ControlSelectorCondition.orchestratorResourceLabel:
      return selector.orchestratorResourceLabel;
    case ControlSelectorCondition.orchestratorType:
      return selector.orchestratorType;
    default:
      return [];
  }
}

export function setControlSelectorValueForProp(
  prop: string,
  values: string[],
  selector: ControlSelector
) {
  switch (prop as unknown as ControlSelectorCondition) {
    case ControlSelectorCondition.operation:
      selector.operation = values;
      break;
    case ControlSelectorCondition.containerImageName:
      selector.containerImageName = values;
      break;
    case ControlSelectorCondition.containerImageTag:
      selector.containerImageTag = values;
      break;
    case ControlSelectorCondition.targetFilePath:
      selector.targetFilePath = values;
      break;
    case ControlSelectorCondition.orchestratorClusterName:
      selector.orchestratorClusterName = values;
      break;
    case ControlSelectorCondition.orchestratorClusterId:
      selector.orchestratorClusterId = values;
      break;
    case ControlSelectorCondition.orchestratorResourceName:
      selector.orchestratorResourceName = values;
      break;
    case ControlSelectorCondition.orchestratorResourceLabel:
      selector.orchestratorResourceLabel = values;
      break;
    case ControlSelectorCondition.orchestratorType:
      selector.orchestratorType = values;
      break;
    default:
  }
}

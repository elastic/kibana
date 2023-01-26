/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ControlSelectorCondition } from '../../types';

export const duplicate = i18n.translate('xpack.cloudDefend.controlDuplicate', {
  defaultMessage: 'Duplicate',
});

export const remove = i18n.translate('xpack.cloudDefend.controlRemove', {
  defaultMessage: 'Remove',
});

export const selectors = i18n.translate('xpack.cloudDefend.controlSelectors', {
  defaultMessage: 'Selectors',
});

export const selectorsHelp = i18n.translate('xpack.cloudDefend.controlSelectorsHelp', {
  defaultMessage: 'Create selectors to match on activities that should be blocked or alerted.',
});

export const responses = i18n.translate('xpack.cloudDefend.controlResponses', {
  defaultMessage: 'Responses',
});

export const responsesHelp = i18n.translate('xpack.cloudDefend.controlResponsesHelp', {
  defaultMessage:
    'Responses are evaluated from top to bottom. At most, one set of actions will be performed.',
});

export const matchSelectors = i18n.translate('xpack.cloudDefend.controlMatchSelectors', {
  defaultMessage: 'Match selectors',
});

export const excludeSelectors = i18n.translate('xpack.cloudDefend.controlExcludeSelectors', {
  defaultMessage: 'Exclude selectors',
});

export const actions = i18n.translate('xpack.cloudDefend.controlResponseActions', {
  defaultMessage: 'Actions',
});

export const actionAlert = i18n.translate('xpack.cloudDefend.controlResponseActionAlert', {
  defaultMessage: 'Alert',
});

export const actionBlock = i18n.translate('xpack.cloudDefend.controlResponseActionBlock', {
  defaultMessage: 'Block',
});

export const actionAlertAndBlock = i18n.translate(
  'xpack.cloudDefend.controlResponseActionAlertAndBlock',
  {
    defaultMessage: 'Alert and block',
  }
);

export const addResponse = i18n.translate('xpack.cloudDefend.addResponse', {
  defaultMessage: 'Add response',
});

export const addSelector = i18n.translate('xpack.cloudDefend.addSelector', {
  defaultMessage: 'Add selector',
});

export const addSelectorCondition = i18n.translate('xpack.cloudDefend.addSelectorCondition', {
  defaultMessage: 'Add condition',
});

export const name = i18n.translate('xpack.cloudDefend.name', {
  defaultMessage: 'Name',
});

export const errorConditionRequired = i18n.translate('xpack.cloudDefend.errorConditionRequired', {
  defaultMessage: 'At least one condition per selector is required.',
});

export const errorDuplicateName = i18n.translate('xpack.cloudDefend.errorDuplicateName', {
  defaultMessage: 'This name is already used by another selector.',
});

export const errorInvalidName = i18n.translate('xpack.cloudDefend.errorInvalidName', {
  defaultMessage: 'Selector names must be alphanumeric and contain no spaces.',
});

export const errorValueRequired = i18n.translate('xpack.cloudDefend.errorValueRequired', {
  defaultMessage: 'At least one value is required.',
});

export const errorValueLengthExceeded = i18n.translate(
  'xpack.cloudDefend.errorValueLengthExceeded',
  {
    defaultMessage: 'Values must not exceed 32 characters.',
  }
);

export const getConditionLabel = (prop: string) => {
  switch (prop) {
    case ControlSelectorCondition.operation:
      return i18n.translate('xpack.cloudDefend.operation', {
        defaultMessage: 'Operation',
      });
    case ControlSelectorCondition.containerImageName:
      return i18n.translate('xpack.cloudDefend.containerImageName', {
        defaultMessage: 'Container image name',
      });
    case ControlSelectorCondition.containerImageTag:
      return i18n.translate('xpack.cloudDefend.containerImageTag', {
        defaultMessage: 'Container image tag',
      });
    case ControlSelectorCondition.targetFilePath:
      return i18n.translate('xpack.cloudDefend.targetFilePath', {
        defaultMessage: 'Target file path',
      });
    case ControlSelectorCondition.orchestratorClusterId:
      return i18n.translate('xpack.cloudDefend.orchestratorClusterId', {
        defaultMessage: 'Orchestrator cluster ID',
      });
    case ControlSelectorCondition.orchestratorClusterName:
      return i18n.translate('xpack.cloudDefend.orchestratorClusterName', {
        defaultMessage: 'Orchestrator cluster name',
      });
    case ControlSelectorCondition.orchestratorNamespace:
      return i18n.translate('xpack.cloudDefend.orchestratorNamespace', {
        defaultMessage: 'Orchestrator namespace',
      });
    case ControlSelectorCondition.orchestratorResourceLabel:
      return i18n.translate('xpack.cloudDefend.orchestratorResourceLabel', {
        defaultMessage: 'Orchestrator resource label',
      });
    case ControlSelectorCondition.orchestratorResourceName:
      return i18n.translate('xpack.cloudDefend.orchestratorResourceName', {
        defaultMessage: 'Orchestrator resource name',
      });
    case ControlSelectorCondition.orchestratorResourceType:
      return i18n.translate('xpack.cloudDefend.orchestratorResourceType', {
        defaultMessage: 'Orchestrator resource type',
      });
  }
};

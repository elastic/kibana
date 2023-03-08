/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SelectorCondition, SelectorType } from '../../types';

export const fileSelector = i18n.translate('xpack.cloudDefend.fileSelector', {
  defaultMessage: 'File selector',
});

export const processSelector = i18n.translate('xpack.cloudDefend.processSelector', {
  defaultMessage: 'Process selector',
});

export const networkSelector = i18n.translate('xpack.cloudDefend.networkSelector', {
  defaultMessage: 'Network (coming soon)',
});

export const conditions = i18n.translate('xpack.cloudDefend.conditions', {
  defaultMessage: 'Conditions: ',
});

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
  defaultMessage:
    'Create file or process selectors to match on operations and or conditions of interest.',
});

export const responses = i18n.translate('xpack.cloudDefend.controlResponses', {
  defaultMessage: 'Responses',
});

export const responsesHelp = i18n.translate('xpack.cloudDefend.controlResponsesHelp', {
  defaultMessage:
    'Use responses to map one or more selectors to a set of actions. Selectors can also be used to "exclude" events.',
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

export const getSelectorIconTooltip = (telemetryType?: SelectorType) => {
  switch (telemetryType) {
    case SelectorType.process:
      return i18n.translate('xpack.cloudDefend.processSelectorIconTooltip', {
        defaultMessage: 'A process selector. Matches only on process operations.',
      });
    case SelectorType.file:
    default:
      return i18n.translate('xpack.cloudDefend.fileSelectorIconTooltip', {
        defaultMessage: 'A file selector. Matches only on file operations.',
      });
  }
};

export const getConditionHelpLabel = (prop: SelectorCondition) => {
  switch (prop) {
    case 'ignoreVolumeMounts':
      return i18n.translate('xpack.cloudDefend.ignoreVolumeMountsHelp', {
        defaultMessage: 'Ignore operations on all volume mounts.',
      });
    case 'ignoreVolumeFiles':
      return i18n.translate('xpack.cloudDefend.ignoreVolumeFilesHelp', {
        defaultMessage:
          'Ignore operations on file mounts only. e.g mounted files, configMaps, secrets etc...',
      });
    default:
      return '';
  }
};

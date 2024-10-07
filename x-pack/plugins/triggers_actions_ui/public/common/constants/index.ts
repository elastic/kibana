/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comparator, COMPARATORS } from '@kbn/alerting-comparators';
import { i18n } from '@kbn/i18n';

export { VIEW_LICENSE_OPTIONS_LINK } from '@kbn/alerts-ui-shared/src/common/constants';
export { AGGREGATION_TYPES, builtInAggregationTypes } from './aggregation_types';
export { loadAllActions, loadActionTypes } from '../../application/lib/action_connector_api';
export { ConnectorAddModal } from '../../application/sections/action_connector_form';
export type { ActionConnector } from '../..';

export { builtInGroupByTypes } from './group_by_types';
export * from './action_frequency_types';

export const PLUGIN_ID = 'triggersActions';
export const ALERTS_PAGE_ID = 'triggersActionsAlerts';
export const CONNECTORS_PLUGIN_ID = 'triggersActionsConnectors';
export {
  I18N_WEEKDAY_OPTIONS,
  I18N_WEEKDAY_OPTIONS_DDD,
} from '@kbn/alerts-ui-shared/src/common/constants/i18n_weekdays';

// Feature flag for frontend rule specific flapping in rule flyout
export const IS_RULE_SPECIFIC_FLAPPING_ENABLED = false;

export const builtInComparators: { [key: string]: Comparator } = {
  [COMPARATORS.GREATER_THAN]: {
    text: i18n.translate('xpack.triggersActionsUI.common.constants.comparators.isAboveLabel', {
      defaultMessage: 'Is above',
    }),
    value: COMPARATORS.GREATER_THAN,
    requiredValues: 1,
  },
  [COMPARATORS.GREATER_THAN_OR_EQUALS]: {
    text: i18n.translate(
      'xpack.triggersActionsUI.common.constants.comparators.isAboveOrEqualsLabel',
      {
        defaultMessage: 'Is above or equals',
      }
    ),
    value: COMPARATORS.GREATER_THAN_OR_EQUALS,
    requiredValues: 1,
  },
  [COMPARATORS.LESS_THAN]: {
    text: i18n.translate('xpack.triggersActionsUI.common.constants.comparators.isBelowLabel', {
      defaultMessage: 'Is below',
    }),
    value: COMPARATORS.LESS_THAN,
    requiredValues: 1,
  },
  [COMPARATORS.LESS_THAN_OR_EQUALS]: {
    text: i18n.translate(
      'xpack.triggersActionsUI.common.constants.comparators.isBelowOrEqualsLabel',
      {
        defaultMessage: 'Is below or equals',
      }
    ),
    value: COMPARATORS.LESS_THAN_OR_EQUALS,
    requiredValues: 1,
  },
  [COMPARATORS.BETWEEN]: {
    text: i18n.translate('xpack.triggersActionsUI.common.constants.comparators.isBetweenLabel', {
      defaultMessage: 'Is between',
    }),
    value: COMPARATORS.BETWEEN,
    requiredValues: 2,
  },
  [COMPARATORS.NOT_BETWEEN]: {
    text: i18n.translate('xpack.triggersActionsUI.common.constants.comparators.isNotBetweenLabel', {
      defaultMessage: 'Is not between',
    }),
    value: COMPARATORS.NOT_BETWEEN,
    requiredValues: 2,
  },
};

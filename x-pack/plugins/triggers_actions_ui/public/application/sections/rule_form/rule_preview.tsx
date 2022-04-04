/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState, useEffect, useCallback, Suspense } from 'react';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiTitle,
  EuiForm,
  EuiSpacer,
  EuiFieldText,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFormRow,
  EuiComboBox,
  EuiFieldNumber,
  EuiSelect,
  EuiIconTip,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiEmptyPrompt,
  EuiListGroupItem,
  EuiListGroup,
  EuiLink,
  EuiText,
  EuiNotificationBadge,
  EuiErrorBoundary,
  EuiToolTip,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { KibanaFeature } from '../../../../../features/public';
import {
  formatDuration,
  getDurationNumberInItsUnit,
  getDurationUnitValue,
  parseDuration,
} from '../../../../../alerting/common/parse_duration';
import { RuleReducerAction, InitialRule } from './rule_reducer';
import {
  RuleTypeModel,
  Rule,
  IErrorObject,
  RuleAction,
  RuleType,
  RuleTypeRegistryContract,
  ActionTypeRegistryContract,
  TriggersActionsUiConfig,
} from '../../../types';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { ActionForm } from '../action_connector_form';
import {
  RuleActionParam,
  ALERTS_FEATURE_ID,
  RecoveredActionGroup,
  isActionGroupDisabledForActionTypeId,
} from '../../../../../alerting/common';
import { hasAllPrivilege, hasShowActionsCapability } from '../../lib/capabilities';
import { SolutionFilter } from './solution_filter';
import './rule_form.scss';
import { useKibana } from '../../../common/lib/kibana';
import { recoveredActionGroupMessage } from '../../constants';
import { getDefaultsForActionParams } from '../../lib/get_defaults_for_action_params';
import { IsEnabledResult, IsDisabledResult } from '../../lib/check_rule_type_enabled';
import { RuleNotifyWhen } from './rule_notify_when';
import { checkRuleTypeEnabled } from '../../lib/check_rule_type_enabled';
import { ruleTypeCompare, ruleTypeGroupCompare } from '../../lib/rule_type_compare';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { SectionLoading } from '../../components/section_loading';
import { useLoadRuleTypes } from '../../hooks/use_load_rule_types';
import { getInitialInterval } from './get_initial_interval';
import { getRuleActionErrors, getRuleErrors, isValidRule } from './rule_errors';
import { diagnoseRule } from '../../lib/rule_api';

export type RulePreview = Pick<Rule, 'params' | 'ruleTypeId'>;

interface RulePreviewProps<MetaData = Record<string, any>> {
  rule: RulePreview;
  // config: TriggersActionsUiConfig;
  // dispatch: React.Dispatch<RuleReducerAction>;
  // errors: IErrorObject;
  // ruleTypeRegistry: RuleTypeRegistryContract;
  // actionTypeRegistry: ActionTypeRegistryContract;
  // operation: string;
  // canChangeTrigger?: boolean; // to hide Change trigger button
  // setHasActionsDisabled?: (value: boolean) => void;
  // setHasActionsWithBrokenConnector?: (value: boolean) => void;
  // metadata?: MetaData;
  // filteredSolutions?: string[] | undefined;
  // onShowPreview: () => void;
}

export const RulePreview = ({ rule }: RulePreviewProps) => {
  const { http } = useKibana().services;

  useEffect(() => {
    (async () => {
      await diagnoseRule({ http, rule: pick(rule, 'ruleTypeId', 'params') });
    })();
  }, [http, rule]);

  return <EuiForm>Yo</EuiForm>;
};

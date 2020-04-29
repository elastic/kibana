/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import React from 'react';
import { isRight } from 'fp-ts/lib/Either';
import { CLIENT_ALERT_TYPES } from '../../../common/constants';
import { TlsTranslations } from './translations';
import {
  AlertTypeModel,
  ValidationResult,
} from '../../../../../../plugins/triggers_action_ui/public/types';
import { AlertTypeInitializer } from '.';
import { AlertTls } from '../../components/overview/alerts/alerts_containers/alert_tls';

const { name, defaultActionMessage } = TlsTranslations;

const validate = (): ValidationResult => ({});

export const initTlsAlertType: AlertTypeInitializer = (): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.TLS,
  iconClass: 'uptimeApp',
  alertParamsExpression: () => <AlertTls />,
  name,
  validate,
  defaultActionMessage,
});

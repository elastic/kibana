/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { AppToast } from '../../../common/components/toasters';
import { Case } from '../../containers/types';
import * as i18n from './translations';

export const createUpdateSuccessToaster = (theCase: Case): AppToast => {
  const toast: AppToast = {
    id: uuid.v4(),
    color: 'success',
    iconType: 'check',
    title: i18n.CASE_CREATED_SUCCESS_TOAST(theCase.title),
  };

  if (theCase.settings.syncAlerts) {
    return { ...toast, text: i18n.CASE_CREATED_SUCCESS_TOAST_TEXT };
  }

  return toast;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import uuid from 'uuid';
import { AppToast } from '../../../common/components/toasters';
import { ToasterContent } from './toaster_content';
import * as i18n from './translations';
import { Case } from '../../../../../cases/common';

export const createUpdateSuccessToaster = (
  theCase: Case,
  onViewCaseClick: (id: string) => void
): AppToast => {
  return {
    id: uuid.v4(),
    color: 'success',
    iconType: 'check',
    title: i18n.CASE_CREATED_SUCCESS_TOAST(theCase.title),
    text: (
      <ToasterContent
        caseId={theCase.id}
        syncAlerts={theCase.settings.syncAlerts}
        onViewCaseClick={onViewCaseClick}
      />
    ),
  };
};

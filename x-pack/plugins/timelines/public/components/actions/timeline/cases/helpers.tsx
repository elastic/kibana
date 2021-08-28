/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import type { Toast } from '../../../../../../../../src/core/public/notifications/toasts/toasts_api';
import type { ToastsStart } from '../../../../../../../../src/core/public/notifications/toasts/toasts_service';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public/util/to_mount_point';
import type { Case } from '../../../../../../cases/common/ui/types';
import { ToasterContent } from './toaster_content';
import * as i18n from './translations';

const LINE_CLAMP = 3;

const Title = styled.span`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const createUpdateSuccessToaster = (
  toasts: ToastsStart,
  theCase: Case,
  onViewCaseClick: (id: string) => void
): Toast => {
  return toasts.addSuccess({
    color: 'success',
    iconType: 'check',
    title: toMountPoint(<Title>{i18n.CASE_CREATED_SUCCESS_TOAST(theCase.title)}</Title>),
    text: toMountPoint(
      <ToasterContent
        caseId={theCase.id}
        syncAlerts={theCase.settings.syncAlerts}
        onViewCaseClick={onViewCaseClick}
      />
    ),
  });
};

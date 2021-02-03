/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiLink } from '@elastic/eui';

import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { getRuleDetailsUrl } from '../../../common/components/link_to';
import { SecurityPageName } from '../../../app/types';

import { Alert } from '../case_view';
import * as i18n from './translations';

interface Props {
  alert: Alert | undefined;
}

const AlertCommentEventComponent: React.FC<Props> = ({ alert }) => {
  const ruleName = alert?.rule?.name ?? null;
  const ruleId = alert?.rule?.id ?? null;
  const { navigateToApp } = useKibana().services.application;

  const onLinkClick = useCallback(
    (ev: { preventDefault: () => void }) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.detections}`, {
        path: getRuleDetailsUrl(ruleId ?? ''),
      });
    },
    [ruleId, navigateToApp]
  );

  return ruleId != null && ruleName != null ? (
    <>
      {`${i18n.ALERT_COMMENT_LABEL_TITLE} `}
      <EuiLink onClick={onLinkClick} data-test-subj={`alert-rule-link-${alert?._id ?? 'deleted'}`}>
        {ruleName}
      </EuiLink>
    </>
  ) : (
    <>{i18n.ALERT_RULE_DELETED_COMMENT_LABEL}</>
  );
};

export const AlertCommentEvent = memo(AlertCommentEventComponent);

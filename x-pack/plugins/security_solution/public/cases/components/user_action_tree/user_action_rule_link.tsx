/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiLink } from '@elastic/eui';

import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { getRuleDetailsUrl, useFormatUrl } from '../../../common/components/link_to';
import { SecurityPageName } from '../../../app/types';

import { Alert } from '../case_view';
import * as i18n from './translations';

interface Props {
  alert: Alert | undefined;
}

const AlertRuleLinkComponent: React.FC<Props> = ({ alert }) => {
  const eventLabel = `${i18n.ALERT_COMMENT_LABEL_TITLE}`;
  const ruleName = alert?.rule?.name ?? '';
  const { navigateToApp } = useKibana().services.application;
  const { formatUrl } = useFormatUrl(SecurityPageName.detections);

  const onLinkClick = (ev: { preventDefault: () => void }) => {
    ev.preventDefault();
    navigateToApp(`${APP_ID}:${SecurityPageName.detections}`, {
      path: formatUrl(getRuleDetailsUrl(alert?.rule?.id ?? '')),
    });
  };

  return (
    <>
      {`${eventLabel} `}
      <EuiLink onClick={onLinkClick}>{ruleName}</EuiLink>
    </>
  );
};

export const AlertRuleLink = memo(AlertRuleLinkComponent);

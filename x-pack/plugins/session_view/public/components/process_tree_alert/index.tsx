/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiIcon,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { ProcessEvent } from '../../../common/types/process_tree';
import { useStyles } from './styles';

export const ProcessTreeAlert = ({ alert }: { alert: ProcessEvent }) => {
  const { http } = useKibana<CoreStart>().services;
  const styles = useStyles();

  if (!alert.kibana) {
    return null;
  }

  const { uuid, rule, original_event: event, workflow_status: status } = alert.kibana.alert;
  const { name, query, severity } = rule;

  return (
    <EuiText
      key={uuid}
      size="s"
      css={styles.alert}
      data-test-subj={`sessionView:sessionViewAlertDetail-${uuid}`}
    >
      <EuiButtonIcon iconType="expand" aria-label="expand" css={styles.alertRowItem} />
      <EuiIcon type="alert" css={styles.alertRowItem} />
      <EuiText size="s" css={styles.alertRowItem}>
        {name}
      </EuiText>
      <EuiBadge color="warning" css={styles.alertRowItem}>
        {status}
      </EuiBadge>
    </EuiText>
  );
};

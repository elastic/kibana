/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiExpression, EuiToolTip } from '@elastic/eui';
import { ResolvedLogView } from '../../../../../common/log_views';

const description = i18n.translate('xpack.infra.logs.alertFlyout.logViewDescription', {
  defaultMessage: 'Log View',
});

interface LogViewSwitcherProps {
  logView: ResolvedLogView;
}

/**
 * TODO: this component is called LogViewSwitcher because it will allow,
 * in a following implementation, to switch between the available logViews
 * with the support of multi-logView concept.
 * It currently renders a read-only expression to tell the user to which logView
 * is the new alert associated with.
 */
export const LogViewSwitcher: React.FC<LogViewSwitcherProps> = ({ logView }) => {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiToolTip content={logView.indices}>
          <EuiExpression description={description} value={logView.name} />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

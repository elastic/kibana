/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCoPilot } from '../..';

export function CoPilotHeaderActionMenuLink() {
  const coPilot = useCoPilot();

  return (
    <EuiHeaderLink
      color="success"
      onClick={() => {
        coPilot?.showList();
      }}
    >
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="training" color="success" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {i18n.translate('xpack.observability.headerMenuPortal.coPilotLink', {
              defaultMessage: 'Co-Pilot',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiHeaderLink>
  );
}

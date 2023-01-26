/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, IconType } from '@elastic/eui';

interface Props {
  label?: string;
  isTechnicalPreview?: boolean;
  iconType?: IconType;
}

export function NavNameWithBetaBadge({ label, iconType, isTechnicalPreview }: Props) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <span className="eui-textTruncate">
          <span>{label}</span>
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ height: 20 }}>
        {isTechnicalPreview ? (
          <EuiBetaBadge
            color="hollow"
            size="s"
            label={i18n.translate('xpack.observability.navigation.experimentalBadgeLabel', {
              defaultMessage: 'Technical preview',
            })}
            iconType={iconType}
          />
        ) : (
          <EuiBetaBadge
            color="subdued"
            size="s"
            label={i18n.translate('xpack.observability.navigation.betaBadge', {
              defaultMessage: 'Beta',
            })}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

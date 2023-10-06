/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTextColor } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

import { useAppContext } from '../../../../../app_context';
import { Index } from '../../../../../../../common';
import { OverviewCard } from './overview_card';

export const StatusDetails: FunctionComponent<{
  documents: Index['documents'];
  documentsDeleted: Index['documents_deleted'];
  status: Index['status'];
  health: Index['health'];
}> = ({ documents, documentsDeleted, status, health }) => {
  const { config } = useAppContext();
  if (!config.enableIndexStats) {
    return null;
  }
  let healthBadge: ReactNode;
  if (health === 'green' || health === 'GREEN') {
    healthBadge = (
      <EuiBadge color="success">
        {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.health.greenLabel', {
          defaultMessage: 'Healthy',
        })}
      </EuiBadge>
    );
  } else if (health === 'yellow' || health === 'YELLOW') {
    healthBadge = (
      <EuiBadge color="warning">
        {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.health.yellowLabel', {
          defaultMessage: 'Warning',
        })}
      </EuiBadge>
    );
  } else if (health === 'red' || health === 'RED') {
    healthBadge = (
      <EuiBadge color="danger">
        {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.health.redLabel', {
          defaultMessage: 'Critical',
        })}
      </EuiBadge>
    );
  }

  return (
    <EuiFlexItem>
      <OverviewCard
        data-test-subj="indexDetailsStatus"
        title={i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.status.cardTitle', {
          defaultMessage: 'Status',
        })}
        content={{
          left: (
            <EuiText
              color={status === 'close' ? 'danger' : 'success'}
              css={css`
                font-size: ${euiThemeVars.euiFontSizeL};
              `}
            >
              {status === 'close'
                ? i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.status.closedLabel', {
                    defaultMessage: 'Closed',
                  })
                : i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.status.openLabel', {
                    defaultMessage: 'Open',
                  })}
            </EuiText>
          ),
          right: healthBadge,
        }}
        footer={{
          left: (
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiIcon type="documents" color="subdued" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTextColor color="subdued">
                  {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.status.documentsLabel', {
                    defaultMessage:
                      '{documents, plural, one {# Document} other {# Documents}} / {documentsDeleted} Deleted',
                    values: {
                      documents,
                      documentsDeleted,
                    },
                  })}
                </EuiTextColor>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        }}
      />
    </EuiFlexItem>
  );
};

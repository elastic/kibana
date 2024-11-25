/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import type { Index } from '../../../../../../../common';
import { useAppContext } from '../../../../../app_context';
import { OverviewCard } from './overview_card';

export const SizeDocCountDetails: FunctionComponent<{
  size: Index['size'];
  documents: Index['documents'];
}> = ({ size, documents }) => {
  const { config } = useAppContext();
  if (!config.enableSizeAndDocCount) {
    return null;
  }
  return (
    <OverviewCard
      data-test-subj="indexDetailsStorage"
      title={i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.storage.cardTitle', {
        defaultMessage: 'Storage',
      })}
      content={{
        left: (
          <EuiFlexGroup gutterSize="xs" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiText
                css={css`
                  font-size: ${euiThemeVars.euiFontSizeL};
                `}
              >
                {size}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.storage.totalSizeLabel', {
                  defaultMessage: 'Total',
                })}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        right: null,
      }}
      footer={{
        left: (
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon type="documents" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{documents}</EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                {i18n.translate(
                  'xpack.idxMgmt.indexDetails.overviewTab.status.meteringDocumentsLabel',
                  {
                    defaultMessage: '{documents, plural, one {Document} other {Documents}}',
                    values: {
                      documents,
                    },
                  }
                )}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    />
  );
};

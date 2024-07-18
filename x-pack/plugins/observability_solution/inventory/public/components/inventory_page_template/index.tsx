/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiPageHeader, EuiPageHeaderContent, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';

const pageSectionContentClassName = css``;

export function InventoryPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const { PageTemplate } = observabilityShared.navigation;

  return (
    <PageTemplate
      pageSectionProps={{
        contentProps: {
          className: pageSectionContentClassName,
        },
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiPageHeader>
          <EuiPageHeaderContent>
            <EuiTitle size="s">
              <h1>
                {i18n.translate('xpack.inventory.inventoryPageHeaderLabel', {
                  defaultMessage: 'Inventory',
                })}
              </h1>
            </EuiTitle>
          </EuiPageHeaderContent>
        </EuiPageHeader>

        {children}
      </EuiFlexGroup>
    </PageTemplate>
  );
}

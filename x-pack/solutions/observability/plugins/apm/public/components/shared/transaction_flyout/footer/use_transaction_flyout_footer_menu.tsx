/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import type { ReactElement } from 'react';
import React, { useMemo, useState } from 'react';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useProfilingPlugin } from '../../../../hooks/use_profiling_plugin';
import { CustomLinkFlyout } from '../../transaction_action_menu/custom_link_flyout';
import { TransactionActionMenuContent } from '../../transaction_action_menu/transaction_action_menu';

const ROOT_PANEL_ID = 0;

// The custom links empty state is a fixed 300px wide; with the 16px padding on each side, this is
// the width of the page-level Investigate popover.
const PANEL_WIDTH = 332;

export interface TransactionFlyoutFooterMenu {
  panels: FlyoutFooterMenuPanel[];
  isLoading: boolean;
  hasActions: boolean;
  /** `CustomLinkFlyout`, rendered as a sibling of the flyout when the license allows custom links. */
  customLinkFlyout: ReactElement | null;
}

/**
 * Resolves the waterfall transaction flyout "Investigate" menu as one custom footer item.
 * The item renders the same sections and custom links as the page action menu.
 */
export function useTransactionFlyoutFooterMenu({
  transaction,
  isTransactionLoading,
}: {
  transaction: Transaction | undefined;
  isTransactionLoading: boolean;
}): TransactionFlyoutFooterMenu {
  const license = useLicenseContext();
  const hasGoldLicense = !!(license?.isActive && license?.hasAtLeast('gold'));
  const { profilingLocators, isLoading: isProfilingLoading } = useProfilingPlugin();
  const { euiTheme } = useEuiTheme();

  const [isCustomLinkFlyoutOpen, setIsCustomLinkFlyoutOpen] = useState(false);

  const panels = useMemo<FlyoutFooterMenuPanel[]>(() => {
    if (!transaction) {
      return [{ id: ROOT_PANEL_ID, items: [] }];
    }

    return [
      {
        id: ROOT_PANEL_ID,
        width: PANEL_WIDTH,
        items: [
          {
            key: 'investigate',
            renderItem: ({ closeMenu }) => (
              <div
                css={css`
                  padding: ${euiTheme.size.base};
                `}
              >
                <TransactionActionMenuContent
                  transaction={transaction}
                  profilingLocators={profilingLocators}
                  hasGoldLicense={hasGoldLicense}
                  onCreateCustomLink={() => {
                    setIsCustomLinkFlyoutOpen(true);
                    closeMenu();
                  }}
                />
              </div>
            ),
          },
        ],
      },
    ];
  }, [transaction, profilingLocators, hasGoldLicense, euiTheme]);

  // `CustomLinkFlyout` fetches on mount, and without a transaction that request has no filters.
  const customLinkFlyout =
    hasGoldLicense && transaction ? (
      <CustomLinkFlyout
        transaction={transaction}
        isOpen={isCustomLinkFlyoutOpen}
        onClose={() => setIsCustomLinkFlyoutOpen(false)}
      />
    ) : null;

  return {
    panels,
    isLoading: isTransactionLoading || isProfilingLoading,
    hasActions: !!transaction,
    customLinkFlyout,
  };
}

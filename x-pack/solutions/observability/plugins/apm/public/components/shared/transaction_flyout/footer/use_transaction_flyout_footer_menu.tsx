/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutFooterMenuItem, FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { ReactElement } from 'react';
import React, { useMemo, useState } from 'react';
import { getEncodedCustomLinkUrl, NO_PERMISSION_LABEL } from '../../../../../common/custom_link';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useProfilingPlugin } from '../../../../hooks/use_profiling_plugin';
import { getFlyoutFooterMenuItem } from '../../flyout_footer_menu/get_flyout_footer_menu_item';
import { CustomLinkFlyout } from '../../transaction_action_menu/custom_link_flyout';
import { useCustomLinks } from '../../transaction_action_menu/custom_link_menu_section';
import {
  useExternalTransactionActions,
  useTransactionActionMenuSections,
} from '../../transaction_action_menu/use_transaction_action_menu_sections';

const DATA_TEST_SUBJ_PREFIX = 'transactionFlyoutActionsMenu';
const ROOT_PANEL_ID = 0;
const CUSTOM_LINKS_PANEL_ID = 'customLinks';
const MAX_CUSTOM_LINKS = 5;

const CUSTOM_LINKS_LABEL = i18n.translate('xpack.apm.transactionActionMenu.customLink.section', {
  defaultMessage: 'Custom Links',
});

export interface TransactionFlyoutFooterMenu {
  panels: FlyoutFooterMenuPanel[];
  isLoading: boolean;
  hasActions: boolean;
  /** `CustomLinkFlyout`, rendered as a sibling of the flyout when the license allows custom links. */
  customLinkFlyout: ReactElement | null;
}

/**
 * Resolves the waterfall transaction flyout "Investigate" menu as `Footer.PrimaryActionMenu` panels:
 * the root panel lists one item per section, each opening a sub-panel of that section's links,
 * followed by actions other plugins register and the custom links panel.
 */
export function useTransactionFlyoutFooterMenu(
  transaction: Transaction | undefined
): TransactionFlyoutFooterMenu {
  const { core } = useApmPluginContext();
  const { link } = useApmRouter();
  const license = useLicenseContext();
  const hasGoldLicense = !!(license?.isActive && license?.hasAtLeast('gold'));
  const canSave = !!core.application.capabilities.apm.save;

  const { profilingLocators, isLoading: isProfilingLoading } = useProfilingPlugin();
  const sections = useTransactionActionMenuSections(transaction, profilingLocators);
  const externalActions = useExternalTransactionActions(transaction);
  const { customLinks, status: customLinksStatus } = useCustomLinks(transaction, {
    isEnabled: hasGoldLicense,
  });

  const [isCustomLinkFlyoutOpen, setIsCustomLinkFlyoutOpen] = useState(false);

  const panels = useMemo<FlyoutFooterMenuPanel[]>(() => {
    const rootItems: FlyoutFooterMenuItem[] = [];
    const subPanels: FlyoutFooterMenuPanel[] = [];

    if (!transaction) {
      return [{ id: ROOT_PANEL_ID, items: rootItems }];
    }

    for (const section of sections.flat()) {
      const title = section.title ?? section.key;
      rootItems.push({
        name: title,
        panel: section.key,
        toolTipContent: section.subtitle,
        'data-test-subj': `${DATA_TEST_SUBJ_PREFIX}Section-${section.key}`,
      });
      subPanels.push({
        id: section.key,
        title,
        // The built-in section actions navigate by href only.
        items: section.actions.map(({ key, label, href }) =>
          getFlyoutFooterMenuItem({ id: key, name: label, href }, DATA_TEST_SUBJ_PREFIX)
        ),
      });
    }

    if (externalActions.length) {
      if (rootItems.length) {
        rootItems.push({ isSeparator: true, key: 'externalSeparator' });
      }
      rootItems.push(
        ...externalActions.map(({ id, name, href, onClick }) =>
          getFlyoutFooterMenuItem(
            { id: `external-${id}`, name, href, onClick },
            DATA_TEST_SUBJ_PREFIX
          )
        )
      );
    }

    if (hasGoldLicense) {
      rootItems.push({
        name: CUSTOM_LINKS_LABEL,
        panel: CUSTOM_LINKS_PANEL_ID,
        toolTipContent: i18n.translate('xpack.apm.transactionActionMenu.customLink.subtitle', {
          defaultMessage: 'Links will open in a new window.',
        }),
        'data-test-subj': `${DATA_TEST_SUBJ_PREFIX}Section-${CUSTOM_LINKS_PANEL_ID}`,
      });

      const customLinkItems: FlyoutFooterMenuItem[] =
        customLinksStatus === FETCH_STATUS.LOADING
          ? [
              {
                name: i18n.translate('xpack.apm.transactionFlyout.customLinksLoading', {
                  defaultMessage: 'Loading…',
                }),
                disabled: true,
                'data-test-subj': `${DATA_TEST_SUBJ_PREFIX}CustomLinksLoading`,
              },
            ]
          : customLinks.slice(0, MAX_CUSTOM_LINKS).map((customLink, index) => ({
              name: customLink.label,
              href: getEncodedCustomLinkUrl(customLink.url, transaction),
              target: '_blank',
              'data-test-subj': `${DATA_TEST_SUBJ_PREFIX}CustomLink-${customLink.id ?? index}`,
            }));

      subPanels.push({
        id: CUSTOM_LINKS_PANEL_ID,
        title: CUSTOM_LINKS_LABEL,
        items: [
          ...customLinkItems,
          ...(customLinkItems.length
            ? [{ isSeparator: true as const, key: 'customLinksSeparator' }]
            : []),
          {
            name: i18n.translate('xpack.apm.customLink.buttom.create', {
              defaultMessage: 'Create custom link',
            }),
            icon: 'plusCircle',
            onClick: () => setIsCustomLinkFlyoutOpen(true),
            disabled: !canSave,
            toolTipContent: canSave ? undefined : NO_PERMISSION_LABEL,
            'data-test-subj': 'apmCustomLinkToolbarCreateButton',
          },
          getFlyoutFooterMenuItem(
            {
              id: 'manageCustomLinks',
              name: i18n.translate('xpack.apm.customLink.buttom.manage', {
                defaultMessage: 'Manage custom links',
              }),
              href: link('/settings/custom-links'),
            },
            DATA_TEST_SUBJ_PREFIX
          ),
        ],
      });
    }

    return [{ id: ROOT_PANEL_ID, items: rootItems }, ...subPanels];
  }, [
    transaction,
    sections,
    externalActions,
    hasGoldLicense,
    customLinks,
    customLinksStatus,
    canSave,
    link,
  ]);

  const hasActions = panels[0].items.length > 0;

  const customLinkFlyout = hasGoldLicense ? (
    <CustomLinkFlyout
      transaction={transaction}
      isOpen={isCustomLinkFlyoutOpen}
      onClose={() => setIsCustomLinkFlyoutOpen(false)}
    />
  ) : null;

  return {
    panels,
    isLoading: !transaction || isProfilingLoading,
    hasActions,
    customLinkFlyout,
  };
}

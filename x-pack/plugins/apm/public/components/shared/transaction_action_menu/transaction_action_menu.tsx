/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ObservabilityTriggerId } from '@kbn/observability-shared-plugin/common';
import {
  ActionMenu,
  ActionMenuDivider,
  getContextMenuItemsFromActions,
  Section,
  SectionLink,
  SectionLinks,
  SectionSubtitle,
  SectionTitle,
} from '@kbn/observability-shared-plugin/public';
import { ProfilingLocators } from '@kbn/profiling-plugin/public';
import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { ApmFeatureFlagName } from '../../../../common/apm_feature_flags';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useApmFeatureFlag } from '../../../hooks/use_apm_feature_flag';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { CustomLinkMenuSection } from './custom_link_menu_section';
import { getSections } from './sections';
import { CreateEditCustomLinkFlyout } from '../../app/settings/custom_link/create_edit_custom_link_flyout';
import { Filter } from '@kbn/apm-plugin/common/custom_link/custom_link_types';
import { useFetcher } from '../../../hooks/use_fetcher';
import { convertFiltersToQuery } from '../../app/settings/custom_link/create_edit_custom_link_flyout/helper';

interface Props {
  readonly transaction?: Transaction;
  isLoading: boolean;
}

function ActionMenuButton({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <EuiButton
      data-test-subj="apmActionMenuButtonInvestigateButton"
      isLoading={isLoading}
      iconType="arrowDown"
      iconSide="right"
      onClick={onClick}
    >
      {i18n.translate('xpack.apm.transactionActionMenu.actionsButtonLabel', {
        defaultMessage: 'Investigate',
      })}
    </EuiButton>
  );
}

export function TransactionActionMenu({ transaction, isLoading }: Props) {
  const license = useLicenseContext();
  const hasGoldLicense = license?.isActive && license?.hasAtLeast('gold');

  const [isActionPopoverOpen, setIsActionPopoverOpen] = useState(false);

  const { isProfilingPluginInitialized, profilingLocators } =
    useProfilingPlugin();

  const filters = useMemo(
    () =>
      [
        { key: 'service.name', value: transaction?.service.name },
        { key: 'service.environment', value: transaction?.service.environment },
        { key: 'transaction.name', value: transaction?.transaction.name },
        { key: 'transaction.type', value: transaction?.transaction.type },
      ].filter((filter): filter is Filter => typeof filter.value === 'string'),
    [transaction]
  );
  
  const [isCreateEditFlyoutOpen, setIsCreateEditFlyoutOpen] = useState(false);

  const toggleCustomLinkFlyout = function (){
    setIsCreateEditFlyoutOpen(true)
    setIsActionPopoverOpen(false)
  }
  
  const { refetch } = useFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/settings/custom_links', {
        isCachable: false,
        params: { query: convertFiltersToQuery(filters) },
      }),
    [filters]
  );

  return (
    <>
      {isCreateEditFlyoutOpen && <CreateEditCustomLinkFlyout
          defaults={{ filters }}
          onClose={() => {
            setIsCreateEditFlyoutOpen(false);  
          }}
          onSave={() => {
            setIsCreateEditFlyoutOpen(false);
            refetch();
          }}
          onDelete={() => {
            setIsCreateEditFlyoutOpen(false);
            refetch();
          }}
        />}

      <ActionMenu
        id="transactionActionMenu"
        closePopover={() => setIsActionPopoverOpen(false)}
        isOpen={isActionPopoverOpen}
        anchorPosition="downRight"
        button={
          <ActionMenuButton
            isLoading={isLoading || isProfilingPluginInitialized === undefined}
            onClick={() =>
              setIsActionPopoverOpen(
                (prevIsActionPopoverOpen) => !prevIsActionPopoverOpen
              )
            }
          />
        }
      >
        <ActionMenuSections
          transaction={transaction}
          profilingLocators={profilingLocators}
        />
        {hasGoldLicense && <CustomLinkMenuSection transaction={transaction} 
              openCreateCustomLinkFlyout={toggleCustomLinkFlyout} />}
      </ActionMenu>
    </>
  );
}

function ActionMenuSections({
  transaction,
  profilingLocators,
}: {
  transaction?: Transaction;
  profilingLocators?: ProfilingLocators;
}) {
  const {
    core,
    uiActions,
    infra: { locators },
  } = useApmPluginContext();
  const location = useLocation();
  const apmRouter = useApmRouter();

  const infraLinksAvailable = useApmFeatureFlag(
    ApmFeatureFlagName.InfraUiAvailable
  );

  const {
    query: { rangeFrom, rangeTo, environment },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/traces/explorer/waterfall',
    '/dependencies/operation'
  );

  const sections = getSections({
    transaction,
    basePath: core.http.basePath,
    location,
    apmRouter,
    infraLocators: locators,
    infraLinksAvailable,
    profilingLocators,
    rangeFrom,
    rangeTo,
    environment,
  });

  const externalMenuItems = useAsync(() => {
    return transaction
      ? getContextMenuItemsFromActions({
          uiActions,
          triggerId: ObservabilityTriggerId.ApmTransactionContextMenu,
          context: transaction,
        })
      : Promise.resolve([]);
  }, [transaction, uiActions]);

  if (externalMenuItems.value?.length) {
    sections.push([
      {
        key: 'external',
        actions: externalMenuItems.value.map((item, i) => {
          return {
            condition: true,
            key: `external-${i}`,
            label: item.children,
            onClick: item.onClick,
            href: item.href,
          };
        }),
      },
    ]);
  }

  return (
    <div data-test-subj="apmActionMenuInvestigateButtonPopup">
      {sections.map((section, idx) => {
        const isLastSection = idx !== sections.length - 1;
        return (
          <div key={idx}>
            {section.map((item) => (
              <Section key={item.key}>
                {item.title && <SectionTitle>{item.title}</SectionTitle>}
                {item.subtitle && (
                  <SectionSubtitle>{item.subtitle}</SectionSubtitle>
                )}
                <SectionLinks>
                  {item.actions.map((action) => (
                    <SectionLink
                      key={action.key}
                      label={action.label}
                      href={action.href}
                      onClick={action.onClick}
                      showNewBadge={action.showNewBadge}
                    />
                  ))}
                </SectionLinks>
              </Section>
            ))}
            {isLastSection && <ActionMenuDivider />}
          </div>
        );
      })}
    </div>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useState } from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { EuiToolTip } from '@elastic/eui';
import { NO_PERMISSION_LABEL } from '../../../../../common/custom_link';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import {
  ActionMenuDivider,
  Section,
  SectionSubtitle,
  SectionTitle,
} from '../../../../../../observability/public';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { CustomLinkList } from './CustomLinkList';
import { CustomLinkToolbar } from './CustomLinkToolbar';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { LoadingStatePrompt } from '../../LoadingStatePrompt';
import { px } from '../../../../style/variables';
import { CreateEditCustomLinkFlyout } from '../../../app/Settings/CustomizeUI/CustomLink/CreateEditCustomLinkFlyout';
import { convertFiltersToQuery } from '../../../app/Settings/CustomizeUI/CustomLink/CreateEditCustomLinkFlyout/helper';
import {
  CustomLink,
  Filter,
} from '../../../../../common/custom_link/custom_link_types';

const DEFAULT_LINKS_TO_SHOW = 3;

export function CustomLinkMenuSection({
  transaction,
}: {
  transaction: Transaction;
}) {
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [isCreateEditFlyoutOpen, setIsCreateEditFlyoutOpen] = useState(false);

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

  const { data: customLinks = [], status, refetch } = useFetcher(
    (callApmApi) =>
      callApmApi({
        isCachable: false,
        endpoint: 'GET /api/apm/settings/custom_links',
        params: { query: convertFiltersToQuery(filters) },
      }),
    [filters]
  );

  return (
    <>
      {isCreateEditFlyoutOpen && (
        <CreateEditCustomLinkFlyout
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
        />
      )}

      <ActionMenuDivider />

      <Section>
        <EuiFlexGroup>
          <EuiFlexItem>
            <SectionTitle>
              {i18n.translate(
                'xpack.apm.transactionActionMenu.customLink.section',
                {
                  defaultMessage: 'Custom Links',
                }
              )}
            </SectionTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <CustomLinkToolbar
              onClickCreate={() => setIsCreateEditFlyoutOpen(true)}
              showCreateButton={customLinks.length > 0}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <SectionSubtitle>
          {i18n.translate(
            'xpack.apm.transactionActionMenu.customLink.subtitle',
            {
              defaultMessage: 'Links will open in a new window.',
            }
          )}
        </SectionSubtitle>
        <CustomLinkList
          customLinks={
            showAllLinks
              ? customLinks
              : customLinks.slice(0, DEFAULT_LINKS_TO_SHOW)
          }
          transaction={transaction}
        />
        <EuiSpacer size="s" />
        <BottomSection
          status={status}
          customLinks={customLinks}
          showAllLinks={showAllLinks}
          toggleShowAll={() => setShowAllLinks((show) => !show)}
          onClickCreate={() => setIsCreateEditFlyoutOpen(true)}
        />
      </Section>
    </>
  );
}

function BottomSection({
  status,
  customLinks,
  showAllLinks,
  toggleShowAll,
  onClickCreate,
}: {
  status: FETCH_STATUS;
  customLinks: CustomLink[];
  showAllLinks: boolean;
  toggleShowAll: () => void;
  onClickCreate: () => void;
}) {
  const { core } = useApmPluginContext();
  const canSave = !!core.application.capabilities.apm.save;

  if (status === FETCH_STATUS.LOADING) {
    return <LoadingStatePrompt />;
  }

  // render empty prompt if there are no custom links
  if (isEmpty(customLinks)) {
    return (
      <EuiFlexGroup responsive={false} direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiText size="xs" grow={false} style={{ width: px(300) }}>
            {i18n.translate('xpack.apm.customLink.empty', {
              defaultMessage:
                'No custom links found. Set up your own custom links, e.g., a link to a specific Dashboard or external link.',
            })}
          </EuiText>
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem style={{ alignItems: 'center' }}>
          <EuiToolTip content={!canSave && NO_PERMISSION_LABEL}>
            <EuiButtonEmpty
              isDisabled={!canSave}
              iconType="plusInCircle"
              size="xs"
              onClick={onClickCreate}
            >
              {i18n.translate('xpack.apm.customLink.buttom.create', {
                defaultMessage: 'Create custom link',
              })}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // render button to toggle "Show all" / "Show fewer"
  if (customLinks.length > DEFAULT_LINKS_TO_SHOW) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType={showAllLinks ? 'arrowUp' : 'arrowDown'}
            onClick={toggleShowAll}
          >
            <EuiText size="s">
              {showAllLinks
                ? i18n.translate(
                    'xpack.apm.transactionActionMenu.customLink.showFewer',
                    { defaultMessage: 'Show fewer' }
                  )
                : i18n.translate(
                    'xpack.apm.transactionActionMenu.customLink.showAll',
                    { defaultMessage: 'Show all' }
                  )}
            </EuiText>
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';
import useThrottle from 'react-use/lib/useThrottle';

import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';

import { INPUT_THROTTLE_DELAY_MS } from '../../../shared/constants/timers';
import { docLinks } from '../../../shared/doc_links';

import { KibanaLogic } from '../../../shared/kibana';
import { LicensingLogic } from '../../../shared/licensing';
import { ENGINES_PATH, ENGINE_CREATION_PATH } from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { LicensingCallout, LICENSING_FEATURE } from '../shared/licensing_callout/licensing_callout';

import { EmptyEnginesPrompt } from './components/empty_engines_prompt';
import { EnginesListTable } from './components/tables/engines_table';
import { CreateEngineFlyout } from './create_engine_flyout';
import { DeleteEngineModal } from './delete_engine_modal';
import { EngineListIndicesFlyout } from './engines_list_flyout';
import { EnginesListFlyoutLogic } from './engines_list_flyout_logic';
import { EnginesListLogic } from './engines_list_logic';

interface CreateEngineButtonProps {
  disabled: boolean;
}
export const CreateEngineButton: React.FC<CreateEngineButtonProps> = ({ disabled }) => {
  const [showPopover, setShowPopover] = useState<boolean>(false);

  return (
    <EuiPopover
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      button={
        <div
          data-test-subj="create-engine-button-hover-target"
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
          tabIndex={0}
        >
          <EuiButton
            fill
            iconType="plusInCircle"
            data-test-subj="enterprise-search-content-engines-creation-button"
            data-telemetry-id="entSearchContent-engines-list-createEngine"
            isDisabled={disabled}
            onClick={() => KibanaLogic.values.navigateToUrl(ENGINE_CREATION_PATH)}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.searchApplications.createEngineButtonLabel',
              {
                defaultMessage: 'Create',
              }
            )}
          </EuiButton>
        </div>
      }
    >
      <EuiPopoverTitle>
        <EuiFlexGroup justifyContent="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="beaker" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.enterpriseSearch.content.searchApplications.createEngineTechnicalPreviewPopover.title"
              defaultMessage="Technical Preview"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <div style={{ width: '300px' }} data-test-subj="create-engine-button-popover-content">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiText size="s">
            <FormattedMessage
              id="xpack.enterpriseSearch.content.searchApplications.createEngineTechnicalPreviewPopover.body"
              defaultMessage="This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features."
            />
          </EuiText>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
interface ListProps {
  createEngineFlyoutOpen?: boolean;
}

export const EnginesList: React.FC<ListProps> = ({ createEngineFlyoutOpen }) => {
  const {
    closeDeleteEngineModal,
    fetchEngines,
    onPaginate,
    openDeleteEngineModal,
    setSearchQuery,
    setIsFirstRequest,
  } = useActions(EnginesListLogic);
  const { openFetchEngineFlyout } = useActions(EnginesListFlyoutLogic);

  const { isCloud, navigateToUrl } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const isGated = !isCloud && !hasPlatinumLicense;

  const {
    deleteModalEngineName,
    hasNoEngines,
    isDeleteModalVisible,
    isLoading,
    meta,
    results,
    searchQuery,
  } = useValues(EnginesListLogic);

  const throttledSearchQuery = useThrottle(searchQuery, INPUT_THROTTLE_DELAY_MS);

  useEffect(() => {
    // Don't fetch search applications if we don't have a valid license
    if (!isGated) {
      fetchEngines();
    }
  }, [meta.from, meta.size, throttledSearchQuery]);

  useEffect(() => {
    // We don't want to trigger loading for each search query change, so we need this
    // flag to set if the call to backend is first request.
    if (!isGated) {
      setIsFirstRequest();
    }
  }, []);

  return (
    <>
      {isDeleteModalVisible ? (
        <DeleteEngineModal engineName={deleteModalEngineName} onClose={closeDeleteEngineModal} />
      ) : null}

      <EngineListIndicesFlyout />
      {createEngineFlyoutOpen && <CreateEngineFlyout onClose={() => navigateToUrl(ENGINES_PATH)} />}
      <EnterpriseSearchEnginesPageTemplate
        pageChrome={[
          i18n.translate('xpack.enterpriseSearch.content.searchApplications.breadcrumb', {
            defaultMessage: 'Search Applications',
          }),
        ]}
        pageHeader={{
          description: (
            <FormattedMessage
              id="xpack.enterpriseSearch.content.searchApplications.description"
              defaultMessage="Search Applications help make your Elasticsearch data searchable for end users, with out-of-the-box relevance, analytics and personalization tools. To learn more, {documentationUrl}."
              values={{
                documentationUrl: (
                  <EuiLink
                    data-test-subj="engines-documentation-link"
                    href={docLinks.enterpriseSearchEngines}
                    target="_blank"
                    data-telemetry-id="entSearchContent-engines-documentation-viewDocumentaion"
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.searchApplications.documentation',
                      {
                        defaultMessage: 'explore our Search Applications documentation',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          ),
          pageTitle: i18n.translate('xpack.enterpriseSearch.content.searchApplications.title', {
            defaultMessage: 'Search Applications',
          }),
          rightSideItems: isLoading
            ? []
            : !hasNoEngines
            ? [<CreateEngineButton disabled={isGated} />]
            : [],
        }}
        pageViewTelemetry="Search Applications"
        isLoading={isLoading && !isGated}
      >
        {isGated && (
          <EuiFlexItem>
            <LicensingCallout feature={LICENSING_FEATURE.SEARCH_APPLICATIONS} />
          </EuiFlexItem>
        )}

        {!hasNoEngines && !isGated ? (
          <>
            <div>
              <EuiFieldSearch
                value={searchQuery}
                placeholder={i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplications.searchPlaceholder',
                  {
                    defaultMessage: 'Search Applications',
                  }
                )}
                aria-label={i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplications.searchBar.ariaLabel',
                  {
                    defaultMessage: 'Search Applications',
                  }
                )}
                fullWidth
                onChange={(event) => {
                  setSearchQuery(event.currentTarget.value);
                }}
              />
            </div>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.content.searchApplications.searchPlaceholder.description',
                {
                  defaultMessage:
                    'Locate a search application via name or by its included indices.',
                }
              )}
            </EuiText>

            <EuiSpacer />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.enterpriseSearch.content.searchApplications.enginesList.description"
                defaultMessage="Showing {from}-{to} of {total}"
                values={{
                  from: (
                    <strong>
                      <FormattedNumber value={meta.from + 1} />
                    </strong>
                  ),
                  to: (
                    <strong>
                      <FormattedNumber value={meta.from + (results?.length ?? 0)} />
                    </strong>
                  ),
                  total: <FormattedNumber value={meta.total} />,
                }}
              />
            </EuiText>

            <EnginesListTable
              enginesList={results}
              meta={meta}
              onChange={onPaginate}
              onDelete={openDeleteEngineModal}
              viewEngineIndices={openFetchEngineFlyout}
              loading={false}
            />
          </>
        ) : (
          <EmptyEnginesPrompt>
            <CreateEngineButton disabled={isGated} />
          </EmptyEnginesPrompt>
        )}

        <EuiSpacer size="xxl" />
        <div />
      </EnterpriseSearchEnginesPageTemplate>
    </>
  );
};

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
import {
  LicensingCallout,
  LICENSING_FEATURE,
} from '../../../shared/licensing_callout/licensing_callout';

import { SEARCH_APPLICATIONS_PATH, SEARCH_APPLICATION_CREATION_PATH } from '../../routes';
import { EnterpriseSearchApplicationsPageTemplate } from '../layout/page_template';

import { EmptySearchApplicationsPrompt } from './components/empty_search_applications_prompt';
import { SearchApplicationsListTable } from './components/tables/search_applications_table';
import { CreateSearchApplication } from './create_search_application_flyout';
import { DeleteSearchApplicationModal } from './delete_search_application_modal';
import { SearchApplicationIndicesFlyout } from './search_application_indices_flyout';
import { SearchApplicationIndicesFlyoutLogic } from './search_application_indices_flyout_logic';
import { SearchApplicationsListLogic } from './search_applications_list_logic';

interface CreateSearchApplicationButtonProps {
  disabled: boolean;
}
export const CreateSearchApplicationButton: React.FC<CreateSearchApplicationButtonProps> = ({
  disabled,
}) => {
  const [showPopover, setShowPopover] = useState<boolean>(false);

  return (
    <EuiPopover
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      button={
        <div
          data-test-subj="create-search-application-button-hover-target"
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
          tabIndex={0}
        >
          <EuiButton
            fill
            iconType="plusInCircle"
            data-test-subj="enterprise-search-search-applications-creation-button"
            data-telemetry-id="entSearchApplications-list-createSearchApplication"
            isDisabled={disabled}
            onClick={() => KibanaLogic.values.navigateToUrl(SEARCH_APPLICATION_CREATION_PATH)}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.searchApplications.list.createSearchApplicationButton.label',
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
              id="xpack.enterpriseSearch.searchApplications.list.createSearchApplicationTechnicalPreviewPopover.title"
              defaultMessage="Beta"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <div
        style={{ width: '300px' }}
        data-test-subj="create-search-application-button-popover-content"
      >
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiText size="s">
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.list.createSearchApplicationTechnicalPreviewPopover.body"
              defaultMessage="This functionality may be changed or removed completely in a future release."
            />
          </EuiText>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
interface ListProps {
  createSearchApplicationFlyoutOpen?: boolean;
}

export const SearchApplicationsList: React.FC<ListProps> = ({
  createSearchApplicationFlyoutOpen,
}) => {
  const {
    closeDeleteSearchApplicationModal,
    fetchSearchApplications,
    onPaginate,
    openDeleteSearchApplicationModal,
    setSearchQuery,
    setIsFirstRequest,
  } = useActions(SearchApplicationsListLogic);
  const { openFlyout: openViewIndicesFlyout } = useActions(SearchApplicationIndicesFlyoutLogic);

  const { isCloud, navigateToUrl } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const isGated = !isCloud && !hasPlatinumLicense;

  const {
    deleteModalSearchApplicationName,
    hasNoSearchApplications,
    isDeleteModalVisible,
    isLoading,
    meta,
    results,
    searchQuery,
  } = useValues(SearchApplicationsListLogic);

  const throttledSearchQuery = useThrottle(searchQuery, INPUT_THROTTLE_DELAY_MS);

  useEffect(() => {
    // Don't fetch search applications if we don't have a valid license
    if (!isGated) {
      fetchSearchApplications();
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
        <DeleteSearchApplicationModal
          searchApplicationName={deleteModalSearchApplicationName}
          onClose={closeDeleteSearchApplicationModal}
        />
      ) : null}

      <SearchApplicationIndicesFlyout />
      {createSearchApplicationFlyoutOpen && (
        <CreateSearchApplication onClose={() => navigateToUrl(SEARCH_APPLICATIONS_PATH)} />
      )}
      <EnterpriseSearchApplicationsPageTemplate
        pageChrome={[]}
        pageHeader={{
          description: (
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.list.description"
              defaultMessage="Search Applications help make your Elasticsearch data easily searchable for end users. Create, build, and manage all your search applications here. To learn more, {documentationUrl}."
              values={{
                documentationUrl: (
                  <EuiLink
                    data-test-subj="search-applications-documentation-link"
                    href={docLinks.searchApplications}
                    target="_blank"
                    data-telemetry-id="entSearchApplications-documentation-viewDocumentaion"
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.searchApplications.list.documentation',
                      {
                        defaultMessage: 'explore our Search Applications documentation',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          ),
          pageTitle: i18n.translate('xpack.enterpriseSearch.searchApplications.list.title', {
            defaultMessage: 'Search Applications',
          }),
          rightSideItems: isLoading
            ? []
            : !hasNoSearchApplications
            ? [<CreateSearchApplicationButton disabled={isGated} />]
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

        {!hasNoSearchApplications && !isGated ? (
          <>
            <div>
              <EuiFieldSearch
                value={searchQuery}
                placeholder={i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.list.searchBar.placeholder',
                  {
                    defaultMessage: 'Search Applications',
                  }
                )}
                aria-label={i18n.translate(
                  'xpack.enterpriseSearch.searchApplications.list.searchBar.ariaLabel',
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
                'xpack.enterpriseSearch.searchApplications.list.searchBar.description',
                {
                  defaultMessage: 'Locate a search application via name.',
                }
              )}
            </EuiText>

            <EuiSpacer />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.list.itemRange"
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

            <SearchApplicationsListTable
              searchApplications={results}
              meta={meta}
              onChange={onPaginate}
              onDelete={openDeleteSearchApplicationModal}
              viewSearchApplicationIndices={openViewIndicesFlyout}
              loading={false}
            />
          </>
        ) : (
          <EmptySearchApplicationsPrompt>
            <CreateSearchApplicationButton disabled={isGated} />
          </EmptySearchApplicationsPrompt>
        )}

        <EuiSpacer size="xxl" />
        <div />
      </EnterpriseSearchApplicationsPageTemplate>
    </>
  );
};

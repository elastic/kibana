/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTablePagination, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React, { useState } from 'react';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../hooks/use_kibana';
import { SloListEmpty } from '../slos/components/slo_list_empty';
import { OutdatedSlo } from './outdated_slo';
import { OutdatedSloSearchBar } from './outdated_slo_search_bar';

export function SlosOutdatedDefinitions() {
  const {
    http: { basePath },
    serverless,
  } = useKibana().services;

  const { data: permissions } = usePermissions();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { hasAtLeast } = useLicense();

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.slosLinkText', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
      {
        text: i18n.translate('xpack.slo.breadcrumbs.slosOutdatedDefinitions', {
          defaultMessage: 'Outdated SLO Definitions',
        }),
      },
    ],
    { serverless }
  );

  const [search, setSearch] = useState<string>('');
  const [activePage, setActivePage] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(10);

  const handlePerPageChange = (perPageNumber: number) => {
    setPerPage(perPageNumber);
    setActivePage(0);
  };

  const { isLoading, data, refetch } = useFetchSloDefinitions({
    name: search,
    includeOutdatedOnly: true,
    page: activePage + 1,
    perPage,
  });
  const { total } = data ?? { total: 0 };

  const hasRequiredWritePrivileges = permissions?.hasAllWriteRequested === true;
  const hasPlatinumLicense = hasAtLeast('platinum') === true;

  const errors = !hasRequiredWritePrivileges ? (
    <EuiText>
      {i18n.translate('xpack.slo.slosOutdatedDefinitions.sloPermissionsError', {
        defaultMessage: 'You must have write permissions for SLOs to access this page',
      })}
    </EuiText>
  ) : !hasPlatinumLicense ? (
    <EuiText>
      {i18n.translate('xpack.slo.slosOutdatedDefinitions.licenseError', {
        defaultMessage: 'You must have atleast a platinum license to access this page',
      })}
    </EuiText>
  ) : null;

  return (
    <ObservabilityPageTemplate
      data-test-subj="slosOutdatedDefinitions"
      pageHeader={{
        pageTitle: i18n.translate('xpack.slo.slosOutdatedDefinitions.pageTitle', {
          defaultMessage: 'Outdated SLO Definitions',
        }),
      }}
    >
      <HeaderMenu />

      {!!errors ? (
        errors
      ) : (
        <>
          <p>
            {i18n.translate('xpack.slo.slosOutdatedDefinitions.description', {
              defaultMessage:
                'The following SLOs are from a previous version and need to either be reset to upgrade to the latest version OR deleted and removed from the system. When you reset the SLO, the transform will be updated to the latest version and the historical data will be regenerated from the source data.',
            })}
          </p>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <OutdatedSloSearchBar
                initialSearch={search}
                onRefresh={refetch}
                onSearch={setSearch}
              />
            </EuiFlexItem>
            {!isLoading && total === 0 && <SloListEmpty />}
            {!isLoading &&
              total > 0 &&
              data &&
              data.results.map((slo) => (
                <OutdatedSlo slo={slo} onDelete={refetch} onReset={refetch} />
              ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {!isLoading && data && (
            <EuiTablePagination
              activePage={activePage}
              pageCount={Math.ceil(total / perPage)}
              itemsPerPage={perPage}
              onChangePage={setActivePage}
              onChangeItemsPerPage={handlePerPageChange}
              itemsPerPageOptions={[10, 20, 50, 100]}
            />
          )}
        </>
      )}
    </ObservabilityPageTemplate>
  );
}

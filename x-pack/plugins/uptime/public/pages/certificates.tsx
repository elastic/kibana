/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useDispatch, useSelector } from 'react-redux';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import React, { useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useTrackPageview } from '../../../observability/public';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { getDynamicSettings } from '../state/actions/dynamic_settings';
import { UptimeRefreshContext } from '../contexts';
import { certificatesSelector, getCertificatesAction } from '../state/certificates/certificates';
import { CertificateList, CertificateSearch, CertSort } from '../components/certificates';

const DEFAULT_PAGE_SIZE = 10;
const LOCAL_STORAGE_KEY = 'xpack.uptime.certList.pageSize';
const getPageSizeValue = () => {
  const value = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '', 10);
  if (isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  return value;
};

export const CertificatesPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'certificates' });
  useTrackPageview({ app: 'uptime', path: 'certificates', delay: 15000 });

  useBreadcrumbs([{ text: 'Certificates' }]);

  const [page, setPage] = useState({ index: 0, size: getPageSizeValue() });
  const [sort, setSort] = useState<CertSort>({
    field: 'not_after',
    direction: 'asc',
  });
  const [search, setSearch] = useState('');

  const dispatch = useDispatch();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      getCertificatesAction.get({
        search,
        ...page,
        sortBy: sort.field,
        direction: sort.direction,
      })
    );
  }, [dispatch, page, search, sort.direction, sort.field, lastRefresh]);

  const { data: certificates } = useSelector(certificatesSelector);

  return (
    <EuiPanel>
      <EuiTitle>
        <h1 className="eui-textNoWrap">
          <FormattedMessage
            id="xpack.uptime.certificates.heading"
            defaultMessage="TLS Certificates ({total})"
            values={{
              total: <span data-test-subj="uptimeCertTotal">{certificates?.total ?? 0}</span>,
            }}
          />
        </h1>
      </EuiTitle>

      <EuiSpacer size="m" />
      <CertificateSearch setSearch={setSearch} />
      <EuiSpacer size="m" />
      <CertificateList
        page={page}
        onChange={(pageVal, sortVal) => {
          setPage(pageVal);
          setSort(sortVal);
          localStorage.setItem(LOCAL_STORAGE_KEY, pageVal.size.toString());
        }}
        sort={sort}
      />
    </EuiPanel>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import { EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { getDynamicSettings } from '../state/actions/dynamic_settings';
import { CertificateList, CertificateSearch, CertSort } from '../components/certificates';
import { useCertSearch } from '../components/certificates/use_cert_search';
import { setCertificatesTotalAction } from '../state/certificates/certificates';

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

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  const certificates = useCertSearch({
    search,
    size: page.size,
    pageIndex: page.index,
    sortBy: sort.field,
    direction: sort.direction,
  });

  useEffect(() => {
    dispatch(setCertificatesTotalAction({ total: certificates.total }));
  }, [certificates.total, dispatch]);

  return (
    <>
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
        certificates={certificates}
      />
    </>
  );
};

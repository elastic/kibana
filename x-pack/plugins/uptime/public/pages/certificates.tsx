/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiHideFor,
  EuiShowFor,
} from '@elastic/eui';
import React, { useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useTrackPageview } from '../../../observability/public';
import { PageHeader } from './page_header';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { OVERVIEW_ROUTE, SETTINGS_ROUTE, CLIENT_ALERT_TYPES } from '../../common/constants';
import { getDynamicSettings } from '../state/actions/dynamic_settings';
import { UptimeRefreshContext } from '../contexts';
import * as labels from './translations';
import { certificatesSelector, getCertificatesAction } from '../state/certificates/certificates';
import { CertificateList, CertificateSearch, CertSort } from '../components/certificates';
import { ToggleAlertFlyoutButton } from '../components/overview/alerts/alerts_containers';

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

  const { lastRefresh, refreshApp } = useContext(UptimeRefreshContext);

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
    <>
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={false} style={{ marginRight: 'auto', alignSelf: 'center' }}>
          <Link to={OVERVIEW_ROUTE} data-test-subj="uptimeCertificatesToOverviewLink">
            <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
              {labels.RETURN_TO_OVERVIEW}
            </EuiButtonEmpty>
          </Link>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ToggleAlertFlyoutButton alertOptions={[CLIENT_ALERT_TYPES.TLS]} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
          <Link to={SETTINGS_ROUTE} data-test-subj="uptimeCertificatesToOverviewLink">
            <EuiButtonEmpty size="s" color="primary" iconType="gear">
              <EuiHideFor sizes={['xs']}> {labels.SETTINGS_ON_CERT}</EuiHideFor>
            </EuiButtonEmpty>
          </Link>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHideFor sizes={['xs']}>
            <EuiButton
              fill
              iconType="refresh"
              onClick={() => {
                refreshApp();
              }}
              data-test-subj="superDatePickerApplyTimeButton"
            >
              {labels.REFRESH_CERT}
            </EuiButton>
          </EuiHideFor>
          <EuiShowFor sizes={['xs']}>
            <EuiButtonEmpty
              iconType="refresh"
              onClick={() => {
                refreshApp();
              }}
              data-test-subj="superDatePickerApplyTimeButton"
            />
          </EuiShowFor>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiPanel>
        <PageHeader
          headingText={
            <FormattedMessage
              id="xpack.uptime.certificates.heading"
              defaultMessage="TLS Certificates ({total})"
              values={{
                total: <span data-test-subj="uptimeCertTotal">{certificates?.total ?? 0}</span>,
              }}
            />
          }
          datePicker={false}
        />
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
    </>
  );
};

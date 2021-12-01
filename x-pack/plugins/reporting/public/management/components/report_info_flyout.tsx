/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiText,
  EuiTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Job } from '../../lib/job';
import { useInternalApiClient } from '../../lib/reporting_api_client';

import { ReportInfoFlyoutContent } from './report_info_flyout_content';

interface Props {
  onClose: () => void;
  job: Job;
}

export const ReportInfoFlyout: FunctionComponent<Props> = ({ onClose, job }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<undefined | Error>();
  const [info, setInfo] = useState<undefined | Job>();
  const isMounted = useMountedState();
  const { apiClient } = useInternalApiClient();

  useEffect(() => {
    (async function loadInfo() {
      if (isLoading) {
        try {
          const infoResponse = await apiClient.getInfo(job.id);
          if (isMounted()) {
            setInfo(infoResponse);
          }
        } catch (err) {
          if (isMounted()) {
            setLoadingError(err);
          }
        } finally {
          if (isMounted()) {
            setIsLoading(false);
          }
        }
      }
    })();
  }, [isLoading, apiClient, job.id, isMounted]);

  return (
    <EuiPortal>
      <EuiFlyout
        ownFocus
        onClose={onClose}
        size="s"
        aria-labelledby="flyoutTitle"
        data-test-subj="reportInfoFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">
              {loadingError
                ? i18n.translate('xpack.reporting.listing.table.reportInfoUnableToFetch', {
                    defaultMessage: 'Unable to fetch report info.',
                  })
                : i18n.translate('xpack.reporting.listing.table.reportCalloutTitle', {
                    defaultMessage: 'Report info',
                  })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoading ? (
            <EuiLoadingSpinner />
          ) : loadingError ? undefined : !!info ? (
            <EuiText>
              <ReportInfoFlyoutContent info={info} />
            </EuiText>
          ) : undefined}
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};

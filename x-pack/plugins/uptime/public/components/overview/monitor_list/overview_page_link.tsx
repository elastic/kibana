/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React, { FunctionComponent, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { useGetUrlParams } from '../../../hooks';
import { stringifyUrlParams } from '../../../lib/helper/stringify_url_params';
import { UptimeSettingsContext } from '../../../contexts';

interface OverviewPageLinkProps {
  dataTestSubj: string;
  direction: string;
  pagination: string;
  loading: boolean;
}

export const OverviewPageLink: FunctionComponent<OverviewPageLinkProps> = ({
  loading,
  dataTestSubj,
  direction,
  pagination,
}) => {
  const icon = direction === 'prev' ? 'arrowLeft' : 'arrowRight';

  const ariaLabel =
    direction === 'next'
      ? i18n.translate('xpack.uptime.overviewPageLink.next.ariaLabel', {
          defaultMessage: 'Next page of results',
        })
      : i18n.translate('xpack.uptime.overviewPageLink.prev.ariaLabel', {
          defaultMessage: 'Prev page of results',
        });

  const disableLinkLabel = i18n.translate('xpack.uptime.overviewPageLink.disabled.ariaLabel', {
    defaultMessage:
      'A disabled pagination button indicating that there cannot be any further navigation in the monitors list.',
  });

  const params = useGetUrlParams();

  const { basePath } = useContext(UptimeSettingsContext);

  const linkParameters = stringifyUrlParams({ ...params, pagination }, true);

  return (
    <EuiButtonIcon
      color="text"
      href={basePath + '/app/uptime' + linkParameters}
      data-test-subj={dataTestSubj}
      iconType={icon}
      aria-label={!pagination ? disableLinkLabel : ariaLabel}
      isDisabled={!pagination || loading}
    />
  );
};

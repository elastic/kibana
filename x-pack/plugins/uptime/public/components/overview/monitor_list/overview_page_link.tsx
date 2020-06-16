/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { setUiState } from '../../../state/actions';

const OverviewPageLinkButtonIcon = styled(EuiButtonIcon)`
  padding-top: 12px;
`;

interface OverviewPageLinkProps {
  dataTestSubj: string;
  direction: string;
  pagination: string;
}

export const OverviewPageLink: React.FC<OverviewPageLinkProps> = (props) => {
  const dispatch = useDispatch();
  const updatePagination = useCallback(
    (nextPagination?: string) => dispatch(setUiState({ currentMonitorListPage: nextPagination })),
    [dispatch]
  );

  return <OverviewPageLinkComponent {...props} updatePagination={updatePagination} />;
};

type Props = OverviewPageLinkProps & { updatePagination: (nextPagination?: string) => void };

export const OverviewPageLinkComponent: React.FC<Props> = ({
  dataTestSubj,
  direction,
  pagination,
  updatePagination,
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

  return (
    <OverviewPageLinkButtonIcon
      color="text"
      onClick={() => {
        updatePagination(pagination);
      }}
      data-test-subj={dataTestSubj}
      iconType={icon}
      aria-label={!pagination ? disableLinkLabel : ariaLabel}
      disabled={!pagination}
    />
  );
};

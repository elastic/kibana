/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiLoadingContent } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useServiceDetailsFetcher } from './use_service_details_fetcher';

interface IconPopoverProps {
  icon: string;
  title: string;
  children: React.ReactChild;
}
export function IconPopover({ icon, title, children }: IconPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    fetchServiceDetails,
    detailsFetchStatus,
  } = useServiceDetailsFetcher();

  const tooglePopover = () => {
    setIsOpen((prevState) => !prevState);
  };

  useEffect(() => {
    fetchServiceDetails(isOpen);
  }, [isOpen, fetchServiceDetails]);

  const isLoading =
    detailsFetchStatus === FETCH_STATUS.LOADING ||
    detailsFetchStatus === FETCH_STATUS.PENDING;

  return (
    <EuiPopover
      ownFocus={false}
      button={
        <EuiButtonEmpty onClick={tooglePopover}>
          <EuiIcon type={icon} size="l" color="black" />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={tooglePopover}
    >
      <EuiPopoverTitle>{title}</EuiPopoverTitle>
      {isLoading ? <EuiLoadingContent /> : children}
    </EuiPopover>
  );
}

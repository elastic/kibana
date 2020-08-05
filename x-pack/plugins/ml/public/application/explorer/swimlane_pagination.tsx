/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiContextMenuPanel,
  EuiPagination,
  EuiContextMenuItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface SwimLanePaginationProps {
  fromPage: number;
  perPage: number;
  cardinality: number;
  onPaginationChange: (arg: { perPage?: number; fromPage?: number }) => void;
}

export const SwimLanePagination: FC<SwimLanePaginationProps> = ({
  cardinality,
  fromPage,
  perPage,
  onPaginationChange,
}) => {
  const componentFromPage = fromPage - 1;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen(() => !isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const goToPage = useCallback((pageNumber: number) => {
    onPaginationChange({ fromPage: pageNumber + 1 });
  }, []);

  const setPerPage = useCallback((perPageUpdate: number) => {
    onPaginationChange({ perPage: perPageUpdate });
  }, []);

  const pageCount = Math.ceil(cardinality / perPage);

  const items = [5, 10, 20, 50, 100].map((v) => {
    return (
      <EuiContextMenuItem
        key={`${v}_rows`}
        icon={v === perPage ? 'check' : 'empty'}
        onClick={() => {
          closePopover();
          setPerPage(v);
        }}
      >
        <FormattedMessage
          id="xpack.ml.explorer.swimLaneSelectRowsPerPage"
          defaultMessage="{rowsCount} rows"
          values={{ rowsCount: v }}
        />
      </EuiContextMenuItem>
    );
  });

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              size="xs"
              color="text"
              iconType="arrowDown"
              iconSide="right"
              onClick={onButtonClick}
            >
              <FormattedMessage
                id="xpack.ml.explorer.swimLaneRowsPerPage"
                defaultMessage="Rows per page: {rowsCount}"
                values={{ rowsCount: perPage }}
              />
            </EuiButtonEmpty>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel items={items} />
        </EuiPopover>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPagination
          aria-label={i18n.translate('xpack.ml.explorer.swimLanePagination', {
            defaultMessage: 'Anomaly swim lane pagination',
          })}
          pageCount={pageCount}
          activePage={componentFromPage}
          onPageClick={goToPage}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

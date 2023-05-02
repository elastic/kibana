/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadgeProps, EuiToolTip, useInnerText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { Filter, isFilterPinned } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/common';
import type { FilterLabelStatus } from '../filter_item/filter_item';
import { FilterBadge } from '../../filter_badge';

interface Props {
  filter: Filter;
  readOnly: boolean;
  valueLabel: string;
  fieldLabel?: string;
  filterLabelStatus: FilterLabelStatus;
  errorMessage?: string;
  hideAlias?: boolean;
  [propName: string]: any;
  dataViews: DataView[];
}

export const FilterView: FC<Props> = ({
  filter,
  readOnly,
  iconOnClick,
  onClick,
  valueLabel,
  fieldLabel,
  errorMessage,
  filterLabelStatus,
  hideAlias,
  dataViews,
  ...rest
}: Props) => {
  const [ref, innerText] = useInnerText();

  const filterString = readOnly
    ? i18n.translate('unifiedSearch.filter.filterBar.filterString', {
        defaultMessage: 'Filter: {innerText}.',
        values: { innerText },
      })
    : i18n.translate('unifiedSearch.filter.filterBar.filterActionsMessage', {
        defaultMessage: 'Filter: {innerText}. Select for more filter actions.',
        values: { innerText },
      });

  let title: string = errorMessage || filterString;
  if (isFilterPinned(filter)) {
    title = `${i18n.translate('unifiedSearch.filter.filterBar.pinnedFilterPrefix', {
      defaultMessage: 'Pinned',
    })} ${title}`;
  }
  if (filter.meta.disabled) {
    title = `${i18n.translate('unifiedSearch.filter.filterBar.disabledFilterPrefix', {
      defaultMessage: 'Disabled',
    })} ${title}`;
  }

  const sharedProps = { color: 'hollow', tabIndex: 0 };
  const badgeProps: EuiBadgeProps = readOnly
    ? // prevent native tooltip for read-only filter pulls by setting title to undefined
      { ...sharedProps, title: undefined }
    : {
        ...sharedProps,
        title, // use native tooltip for non-read-only filter pills
        iconType: 'cross',
        iconSide: 'right',
        closeButtonProps: {
          // Removing tab focus on close button because the same option can be obtained through the context menu
          // Also, we may want to add a `DEL` keyboard press functionality
          tabIndex: -1,
        },
        iconOnClick,
        iconOnClickAriaLabel: i18n.translate(
          'unifiedSearch.filter.filterBar.filterItemBadgeIconAriaLabel',
          {
            defaultMessage: 'Delete {filter}',
            values: { filter: innerText },
          }
        ),
        onClick,
        onClickAriaLabel: i18n.translate(
          'unifiedSearch.filter.filterBar.filterItemBadgeAriaLabel',
          {
            defaultMessage: 'Filter actions',
          }
        ),
      };

  const FilterPill = () => (
    <FilterBadge
      filter={filter}
      dataViews={dataViews}
      valueLabel={valueLabel}
      filterLabelStatus={filterLabelStatus}
      hideAlias={hideAlias}
      {...badgeProps}
      {...rest}
      data-test-subj={`filter-badge-'${innerText}' ${rest['data-test-subj']}`}
    />
  );

  return readOnly ? (
    <EuiToolTip position="bottom" content={title}>
      <span ref={ref}>
        <FilterPill />
      </span>
    </EuiToolTip>
  ) : (
    <span ref={ref}>
      <FilterPill />
    </span>
  );
};

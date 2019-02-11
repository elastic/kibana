/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';
import { InfraLogItem, InfraLogItemField } from '../../graphql/types';
import { InfraLoadingPanel } from '../loading';
interface Props {
  flyoutItem: InfraLogItem | null;
  hideFlyout: () => void;
  setFilter: (filter: string) => void;
  intl: InjectedIntl;
  loading: boolean;
}

export const LogFlyout = injectI18n(
  ({ flyoutItem, loading, hideFlyout, setFilter, intl }: Props) => {
    const handleFilter = (field: InfraLogItemField) => () => {
      const filter = `${field.field}:"${field.value}"`;
      setFilter(filter);
    };

    const columns = [
      {
        field: 'field',
        name: intl.formatMessage({
          defaultMessage: 'Field',
          id: 'xpack.infra.logFlyout.fieldColumnLabel',
        }),
        sortable: true,
      },
      {
        field: 'value',
        name: intl.formatMessage({
          defaultMessage: 'Value',
          id: 'xpack.infra.logFlyout.valueColumnLabel',
        }),
        sortable: true,
        render: (name: string, item: InfraLogItemField) => (
          <span>
            <EuiToolTip
              content={intl.formatMessage({
                id: 'xpack.infra.logFlyout.setFilterTooltip',
                defaultMessage: 'Set Filter',
              })}
            >
              <EuiButtonIcon
                color="text"
                iconType="filter"
                aria-label={intl.formatMessage({
                  id: 'xpack.infra.logFlyout.filterAriaLabel',
                  defaultMessage: 'Filter',
                })}
                onClick={handleFilter(item)}
              />
            </EuiToolTip>
            {item.value}
          </span>
        ),
      },
    ];
    return (
      <EuiFlyout onClose={() => hideFlyout()} size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Log event document details"
                id="xpack.infra.logFlyout.flyoutTitle"
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {loading || flyoutItem === null ? (
            <InfraFlyoutLoadingPanel>
              <InfraLoadingPanel
                height="100%"
                width="100%"
                text={intl.formatMessage({
                  id: 'xpack.infra.logFlyout.loadingMessage',
                  defaultMessage: 'Loading Event',
                })}
              />
            </InfraFlyoutLoadingPanel>
          ) : (
            <EuiBasicTable columns={columns} items={flyoutItem.fields} />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);

export const InfraFlyoutLoadingPanel = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

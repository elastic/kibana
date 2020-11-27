/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { euiStyled } from '../../../../../../../../../observability/public';

interface Row {
  name: string;
  value: string | undefined;
}

interface Props {
  rows: Row[];
  title: string;
  onClick(item: Row): void;
}

export const Table = (props: Props) => {
  const { rows, title, onClick } = props;
  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: '',
        sortable: false,
        render: (name: string, item: Row) => (
          <EuiText size="xs">
            <strong>{item.name}</strong>
          </EuiText>
        ),
      },
      {
        field: 'value',
        name: '',
        sortable: false,
        render: (_name: string, item: Row) => (
          <span>
            <EuiToolTip
              content={i18n.translate('xpack.infra.nodeDetails.tabs.metadata.setFilterTooltip', {
                defaultMessage: 'View event with filter',
              })}
            >
              <EuiButtonIcon
                color="text"
                iconType="filter"
                aria-label={i18n.translate(
                  'xpack.infra.nodeDetails.tabs.metadata.filterAriaLabel',
                  {
                    defaultMessage: 'Filter',
                  }
                )}
                onClick={() => onClick(item)}
              />
            </EuiToolTip>
            {item.value}
          </span>
        ),
      },
    ],
    [onClick]
  );

  return (
    <>
      <TitleWrapper>
        <EuiText>
          <h3>{title}</h3>
        </EuiText>
      </TitleWrapper>
      <TableWithoutHeader columns={columns} items={rows} />
    </>
  );
};

const TitleWrapper = euiStyled.div`
  margin-bottom: 10px
`;

class TableWithoutHeader extends EuiBasicTable {
  renderTableHead() {
    return <></>;
  }
}

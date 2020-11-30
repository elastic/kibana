/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { euiStyled } from '../../../../../../../../../observability/public';

interface Row {
  name: string;
  value: string | string[] | undefined;
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
        width: '35%',
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
        width: '65%',
        sortable: false,
        render: (_name: string, item: Row) => {
          return (
            <span>
              <EuiToolTip
                content={i18n.translate('xpack.infra.nodeDetails.tabs.metadata.setFilterTooltip', {
                  defaultMessage: 'View event with filter',
                })}
              >
                <EuiFlexGroup gutterSize={'xs'}>
                  <EuiFlexItem grow={false}>
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
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {!Array.isArray(item.value) && item.value}
                    {Array.isArray(item.value) && <ArrayValue values={item.value} />}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiToolTip>
            </span>
          );
        },
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
      <TableWithoutHeader tableLayout="fixed" compressed columns={columns} items={rows} />
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

interface MoreProps {
  values: string[];
}
const ArrayValue = (props: MoreProps) => {
  const { values } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return (
    <>
      {!isExpanded && (
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            {values[0]}
            {' ... '}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLink onClick={expand}>
              <FormattedMessage
                id="xpack.infra.nodeDetails.tabs.metadata.seeMore"
                defaultMessage="+{count} more"
                values={{
                  count: values.length,
                }}
              />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {isExpanded && (
        <div>
          {values.map((v) => (
            <div key={v}>{v}</div>
          ))}
          <EuiLink onClick={collapse}>
            {i18n.translate('xpack.infra.nodeDetails.tabs.metadata.seeLess', {
              defaultMessage: 'See less',
            })}
          </EuiLink>
        </div>
      )}
    </>
  );
};

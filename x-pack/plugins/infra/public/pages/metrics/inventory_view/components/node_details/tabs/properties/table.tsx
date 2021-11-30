/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiBasicTable,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { first } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

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
              <EuiFlexGroup gutterSize={'xs'} alignItems={'center'} responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.infra.nodeDetails.tabs.metadata.setFilterTooltip',
                      {
                        defaultMessage: 'View event with filter',
                      }
                    )}
                  >
                    <EuiButtonIcon
                      color="text"
                      size="s"
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
                </EuiFlexItem>
                <EuiFlexItem>
                  {!Array.isArray(item.value) && item.value}
                  {Array.isArray(item.value) && <ArrayValue values={item.value} />}
                </EuiFlexItem>
              </EuiFlexGroup>
            </span>
          );
        },
      },
    ],
    [onClick]
  );

  return (
    <>
      <EuiText>
        <h4>{title}</h4>
      </EuiText>
      <EuiSpacer size={'s'} />
      <TableWithoutHeader
        tableLayout={'fixed'}
        compressed
        responsive={false}
        columns={columns}
        items={rows}
      />
    </>
  );
};

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
        <EuiFlexGroup gutterSize={'xs'} responsive={false} alignItems={'baseline'} wrap={true}>
          <EuiFlexItem grow={false}>
            {first(values)}
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
              defaultMessage: 'Show less',
            })}
          </EuiLink>
        </div>
      )}
    </>
  );
};

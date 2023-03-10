/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiLink, EuiBasicTable } from '@elastic/eui';
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
}

/**
 * Columns translations
 */
const FIELD_LABEL = i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.field', {
  defaultMessage: 'Field',
});

const VALUE_LABEL = i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.value', {
  defaultMessage: 'Value',
});

export const Table = (props: Props) => {
  const { rows } = props;
  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: FIELD_LABEL,
        width: '35%',
        sortable: false,
        render: (name: string) => <EuiText size="s">{name}</EuiText>,
      },
      {
        field: 'value',
        name: VALUE_LABEL,
        width: '65%',
        sortable: false,
        render: (_name: string, item: Row) => {
          return (
            <>
              {!Array.isArray(item.value) && item.value}
              {Array.isArray(item.value) && <ArrayValue values={item.value} />}
            </>
          );
        },
      },
    ],
    []
  );

  return <EuiBasicTable tableLayout={'fixed'} responsive={false} columns={columns} items={rows} />;
};

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

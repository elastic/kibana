/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiLink, EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import useToggle from 'react-use/lib/useToggle';
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
        render: (_name: string, item: Row) => <ExpandableContent values={item.value} />,
      },
    ],
    []
  );

  return <EuiBasicTable tableLayout={'fixed'} responsive={false} columns={columns} items={rows} />;
};

interface ExpandableContentProps {
  values: string | string[] | undefined;
}
const ExpandableContent = (props: ExpandableContentProps) => {
  const { values } = props;
  const [isExpanded, toggle] = useToggle(false);

  const list = Array.isArray(values) ? values : [values];
  const [first, ...others] = list;
  const hasOthers = others.length > 0;
  const shouldShowMore = hasOthers && !isExpanded;

  return (
    <EuiFlexGroup
      gutterSize={'xs'}
      responsive={false}
      alignItems={'baseline'}
      wrap={true}
      direction="column"
    >
      <div>
        {first}
        {shouldShowMore && (
          <>
            {' ... '}
            <EuiLink data-test-subj="infraExpandableContentCountMoreLink" onClick={toggle}>
              <FormattedMessage
                id="xpack.infra.nodeDetails.tabs.metadata.seeMore"
                defaultMessage="+{count} more"
                values={{
                  count: others.length,
                }}
              />
            </EuiLink>
          </>
        )}
      </div>
      {isExpanded && others.map((item) => <EuiFlexItem key={item}>{item}</EuiFlexItem>)}
      {hasOthers && isExpanded && (
        <EuiFlexItem>
          <EuiLink data-test-subj="infraExpandableContentShowLessLink" onClick={toggle}>
            {i18n.translate('xpack.infra.nodeDetails.tabs.metadata.seeLess', {
              defaultMessage: 'Show less',
            })}
          </EuiLink>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

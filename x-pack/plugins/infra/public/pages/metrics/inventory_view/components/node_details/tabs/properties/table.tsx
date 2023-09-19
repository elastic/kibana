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
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useToggle from 'react-use/lib/useToggle';

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
                      data-test-subj="infraColumnsButton"
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
                  <ExpandableContent values={item.value} />
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
            <EuiLink data-test-subj="infraArrayValueCountMoreLink" onClick={toggle}>
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
          <EuiLink data-test-subj="infraArrayValueShowLessLink" onClick={toggle}>
            {i18n.translate('xpack.infra.nodeDetails.tabs.metadata.seeLess', {
              defaultMessage: 'Show less',
            })}
          </EuiLink>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

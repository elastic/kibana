/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTitle, EuiLink, EuiIcon, EuiText, EuiSpacer } from '@elastic/eui';

import { useCollapsibleList } from './use_collapsible_list';

interface Props {
  dataStreams: string[] | string | undefined;
}

export const CollapsibleDataStreamsList: React.FunctionComponent<Props> = ({ dataStreams }) => {
  const { isShowingFullList, setIsShowingFullList, items, hiddenItemsCount } = useCollapsibleList({
    items: dataStreams,
  });

  return items === 'all' ? (
    <FormattedMessage
      id="xpack.snapshotRestore.dataStreamsList.allDataStreamsValue"
      defaultMessage="All data streams"
    />
  ) : (
    <>
      <EuiText>
        <ul>
          {items.map((dataStream) => (
            <li key={dataStream}>
              <EuiTitle size="xs">
                <span>{dataStream}</span>
              </EuiTitle>
            </li>
          ))}
        </ul>
      </EuiText>
      {hiddenItemsCount ? (
        <>
          <EuiSpacer size="xs" />
          <EuiLink
            onClick={() =>
              isShowingFullList ? setIsShowingFullList(false) : setIsShowingFullList(true)
            }
          >
            {isShowingFullList ? (
              <FormattedMessage
                id="xpack.snapshotRestore.dataStreamsList.dataStreamsCollapseAllLink"
                defaultMessage="Hide {count, plural, one {# data stream} other {# data streams}}"
                values={{ count: hiddenItemsCount }}
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.dataStreamsList.dataStreamsExpandAllLink"
                defaultMessage="Show {count, plural, one {# data stream} other {# data streams}}"
                values={{ count: hiddenItemsCount }}
              />
            )}{' '}
            <EuiIcon type={isShowingFullList ? 'arrowUp' : 'arrowDown'} />
          </EuiLink>
        </>
      ) : null}
    </>
  );
};

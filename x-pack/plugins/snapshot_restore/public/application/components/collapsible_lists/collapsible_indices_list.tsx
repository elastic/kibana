/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiLink, EuiIcon, EuiText, EuiSpacer } from '@elastic/eui';

import { useCollapsibleList } from './use_collapsible_list';

interface Props {
  indices: string[] | string | undefined;
}

export const CollapsibleIndicesList: React.FunctionComponent<Props> = ({ indices }) => {
  const { hiddenItemsCount, isShowingFullList, items, setIsShowingFullList } = useCollapsibleList({
    items: indices,
  });
  return items === 'all' ? (
    <FormattedMessage
      id="xpack.snapshotRestore.indicesList.allIndicesValue"
      defaultMessage="All indices"
    />
  ) : (
    <>
      <EuiText>
        <ul>
          {items.map((index) => (
            <li key={index}>
              <EuiTitle size="xs">
                <span>{index}</span>
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
                id="xpack.snapshotRestore.indicesList.indicesCollapseAllLink"
                defaultMessage="Hide {count, plural, one {# index} other {# indices}}"
                values={{ count: hiddenItemsCount }}
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.indicesList.indicesExpandAllLink"
                defaultMessage="Show {count, plural, one {# index} other {# indices}}"
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

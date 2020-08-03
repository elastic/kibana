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
  const [isShowingFullIndicesList, setIsShowingFullIndicesList] = useState<boolean>(false);
  const hiddenIndicesCount = indices && indices.length > 10 ? indices.length - 10 : 0;

  return (
    <>
      {indices ? (
        <>
          <EuiText>
            <ul>
              {(isShowingFullIndicesList ? indices : [...indices].splice(0, 10)).map(
                (index: string) => (
                  <li key={index}>
                    <EuiTitle size="xs">
                      <span>{index}</span>
                    </EuiTitle>
                  </li>
                )
              )}
            </ul>
          </EuiText>
          {hiddenIndicesCount ? (
            <>
              <EuiSpacer size="xs" />
              <EuiLink
                onClick={() =>
                  isShowingFullIndicesList
                    ? setIsShowingFullIndicesList(false)
                    : setIsShowingFullIndicesList(true)
                }
              >
                {isShowingFullIndicesList ? (
                  <FormattedMessage
                    id="xpack.snapshotRestore.indicesList.indicesCollapseAllLink"
                    defaultMessage="Hide {count, plural, one {# index} other {# indices}}"
                    values={{ count: hiddenIndicesCount }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.snapshotRestore.indicesList.indicesExpandAllLink"
                    defaultMessage="Show {count, plural, one {# index} other {# indices}}"
                    values={{ count: hiddenIndicesCount }}
                  />
                )}{' '}
                <EuiIcon type={isShowingFullIndicesList ? 'arrowUp' : 'arrowDown'} />
              </EuiLink>
            </>
          ) : null}
        </>
      ) : (
        <FormattedMessage
          id="xpack.snapshotRestore.indicesList.allIndicesValue"
          defaultMessage="All indices"
        />
      )}
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiLink, EuiIcon, EuiText, EuiSpacer } from '@elastic/eui';

interface Props {
  dataStreams: string[] | string | undefined;
}

export const CollapsibleDataStreamsList: React.FunctionComponent<Props> = ({ dataStreams }) => {
  const [isShowingFullDataStreamsList, setIsShowingFullDataStreamsList] = useState<boolean>(false);
  const displayDataStreams = dataStreams
    ? typeof dataStreams === 'string'
      ? dataStreams.split(',')
      : dataStreams
    : undefined;
  const hiddenDataStreams =
    displayDataStreams && displayDataStreams.length > 10 ? displayDataStreams.length - 10 : 0;
  return (
    <>
      {displayDataStreams ? (
        <>
          <EuiText>
            <ul>
              {(isShowingFullDataStreamsList
                ? displayDataStreams
                : [...displayDataStreams].splice(0, 10)
              ).map((dataStream) => (
                <li key={dataStream}>
                  <EuiTitle size="xs">
                    <span>{dataStream}</span>
                  </EuiTitle>
                </li>
              ))}
            </ul>
          </EuiText>
          {hiddenDataStreams ? (
            <>
              <EuiSpacer size="xs" />
              <EuiLink
                onClick={() =>
                  isShowingFullDataStreamsList
                    ? setIsShowingFullDataStreamsList(false)
                    : setIsShowingFullDataStreamsList(true)
                }
              >
                {isShowingFullDataStreamsList ? (
                  <FormattedMessage
                    id="xpack.snapshotRestore.dataStreamsList.dataStreamsCollapseAllLink"
                    defaultMessage="Hide {count, plural, one {# data stream} other {# data streams}}"
                    values={{ count: hiddenDataStreams }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.snapshotRestore.dataStreamsList.dataStreamsExpandAllLink"
                    defaultMessage="Show {count, plural, one {# data stream} other {# data streams}}"
                    values={{ count: hiddenDataStreams }}
                  />
                )}{' '}
                <EuiIcon type={isShowingFullDataStreamsList ? 'arrowUp' : 'arrowDown'} />
              </EuiLink>
            </>
          ) : null}
        </>
      ) : (
        <FormattedMessage
          id="xpack.snapshotRestore.dataStreamsList.allDataStreamsValue"
          defaultMessage="All data streams"
        />
      )}
    </>
  );
};

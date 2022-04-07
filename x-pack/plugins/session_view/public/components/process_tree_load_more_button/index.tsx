/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useStyles } from './styles';

export interface ProcessTreeLoadMoreButtonDeps {
  onClick: () => void;
  text: string;
  isFetching: boolean;
  eventsRemaining: number;
  forward: boolean;
}

export const ProcessTreeLoadMoreButton = ({
  onClick,
  text,
  isFetching,
  eventsRemaining,
  forward,
}: ProcessTreeLoadMoreButtonDeps) => {
  const styles = useStyles();

  return (
    <div css={styles.wrapper}>
      <EuiButtonEmpty
        size="xs"
        iconType={forward ? 'arrowDown' : 'arrowUp'}
        onClick={onClick}
        isLoading={isFetching}
      >
        {text}
        {eventsRemaining !== 0 && (
          <FormattedMessage
            id="xpack.sessionView.processTreeLoadMoreButton"
            defaultMessage=" ({count} left)"
            values={{ count: eventsRemaining }}
          />
        )}
      </EuiButtonEmpty>
      <span css={styles.dottedLine} />
    </div>
  );
};

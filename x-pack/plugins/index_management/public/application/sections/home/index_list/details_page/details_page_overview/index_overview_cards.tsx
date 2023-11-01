/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FunctionComponent } from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { Index } from '../../../../../../../common';
import { useAppContext } from '../../../../../app_context';

export const IndexOverviewCards: FunctionComponent<{ index: Index }> = ({ index }) => {
  const {
    services: { extensionsService },
    core: { getUrlForApp },
  } = useAppContext();
  const cards = extensionsService.indexOverviewCards.map(({ renderCardContent }, i) => {
    const card = renderCardContent({ index, getUrlForApp });

    if (!card) {
      return null;
    }
    return (
      <Fragment key={`extensionsSummary-${i}`}>
        <EuiPanel data-test-subj={`extensionsSummary-${i}`} hasBorder={true}>
          {card}
        </EuiPanel>
        <EuiSpacer />
      </Fragment>
    );
  });
  return <>{cards}</>;
};

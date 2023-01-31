/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';

interface DisplayMoreOptionsProps {
  showingMoreOptions: boolean;
  toggleShowingMoreOptions: () => void;
}

const DisplayMoreOptionsComponent: React.FC<DisplayMoreOptionsProps> = ({
  showingMoreOptions,
  toggleShowingMoreOptions,
}) => {
  return (
    <EuiButtonEmpty
      color="primary"
      iconSide="right"
      iconType={showingMoreOptions ? 'arrowUp' : 'arrowDown'}
      flush="left"
      onClick={toggleShowingMoreOptions}
      data-test-subj="opsgenie-display-more-options"
    >
      {showingMoreOptions ? i18n.HIDE_OPTIONS : i18n.MORE_OPTIONS}
    </EuiButtonEmpty>
  );
};

DisplayMoreOptionsComponent.displayName = 'MoreOptions';

export const DisplayMoreOptions = React.memo(DisplayMoreOptionsComponent);

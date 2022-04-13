/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { SavedObjectReferenceWithContext } from 'src/core/public';

import type { ShareToSpaceSavedObjectTarget } from '../types';

interface Props {
  savedObjectTarget: ShareToSpaceSavedObjectTarget;
  referenceGraph: SavedObjectReferenceWithContext[];
  isDisabled: boolean;
}

export const RelativesFooter = (props: Props) => {
  const { savedObjectTarget, referenceGraph, isDisabled } = props;

  const relativesCount = useMemo(() => {
    const { type, id } = savedObjectTarget;
    return referenceGraph.filter(
      (x) => (x.type !== type || x.id !== id) && x.spaces.length > 0 && !x.isMissing
    ).length;
  }, [savedObjectTarget, referenceGraph]);

  if (relativesCount > 0) {
    return (
      <>
        <EuiText size="s" color={isDisabled ? 'subdued' : undefined}>
          <FormattedMessage
            id="xpack.spaces.shareToSpace.relativesControl.description"
            defaultMessage="{relativesCount} related {relativesCount, plural, one {object} other {objects}} will also change."
            values={{ relativesCount }}
          />
        </EuiText>
        <EuiHorizontalRule margin="s" />
      </>
    );
  }
  return null;
};

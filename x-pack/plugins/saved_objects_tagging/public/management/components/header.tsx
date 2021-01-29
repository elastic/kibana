/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface HeaderProps {
  canCreate: boolean;
  onCreate: () => void;
}

export const Header: FC<HeaderProps> = ({ canCreate, onCreate }) => {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="xpack.savedObjectsTagging.management.header.title"
                defaultMessage="Tags"
              />
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {canCreate && (
            <EuiButton
              key="createTag"
              iconType="tag"
              color="primary"
              fill
              data-test-subj="createTagButton"
              onClick={onCreate}
              isDisabled={false}
            >
              <FormattedMessage
                id="xpack.savedObjectsTagging.management.actions.createTag"
                defaultMessage="Create tag"
              />
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.header.description"
              defaultMessage="Use tags to categorize and easily find your objects."
            />
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};

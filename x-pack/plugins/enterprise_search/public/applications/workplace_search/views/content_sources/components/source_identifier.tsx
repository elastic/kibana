/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCopy,
  EuiButtonIcon,
  EuiFieldText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { COPY_TOOLTIP, COPIED_TOOLTIP } from '../../../constants';

import { ID_LABEL } from '../constants';

interface Props {
  id: string;
}

export const SourceIdentifier: React.FC<Props> = ({ id }) => (
  <>
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{ID_LABEL}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy beforeMessage={COPY_TOOLTIP} afterMessage={COPIED_TOOLTIP} textToCopy={id}>
          {(copy) => (
            <EuiButtonIcon
              aria-label={COPY_TOOLTIP}
              onClick={copy}
              iconType="copy"
              color="primary"
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldText
          value={id}
          readOnly
          aria-label={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.sourceIdentifier.sourceIdentifierFieldLabel',
            {
              defaultMessage: 'Source Identifier',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
